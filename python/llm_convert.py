"""LLM-assisted MarkItDown conversion for the dsh-markitdown plugin.

MarkItDown's LLM integration (describing embedded images instead of
emitting raw data URIs) is only exposed through its Python API, so the
plugin ships this helper and spawns it with the configured interpreter.
The API key arrives in a fixed internal environment variable the plugin
injects after resolving it from the dsh credential store; the named
variable is only a fallback for keys the user exported themselves. The
key never passes through the plugin configuration or argv.

DOCX: markitdown 0.1.x does not route Word images through its LLM
integration (`_docx_converter._image_to_html` returns None), so a .docx
always yields `![](data:image/...;base64...)` placeholders. This helper
extracts `word/media` images in document order, describes each one with
the same multimodal model, and replaces the placeholders in place. Other
formats keep markitdown's native behavior (images and PPTX already use
the LLM client).

Usage: llm_convert.py <model> <api_key_env> <target> [--extension EXT] [--base-url URL]
"""

import argparse
import base64
import mimetypes
import os
import posixpath
import re
import sys
import zipfile
from concurrent.futures import ThreadPoolExecutor

# markitdown's placeholder for an embedded image in converted Markdown.
IMAGE_MARKER = re.compile(r"!\[[^\]]*\]\(data:image/[^)]*\)")

# Skip absurdly large embedded images rather than sending them to the model.
MAX_IMAGE_BYTES = 8 * 1024 * 1024

# The relationship part is a few KiB in practice; cap it before decoding.
MAX_RELS_BYTES = 4 * 1024 * 1024

# Enough parallelism to keep a many-image document well inside the plugin's
# per-conversion timeout, while staying gentle on provider rate limits.
IMAGE_WORKERS = 4

IMAGE_PROMPT = (
    "Describe this image for a Markdown conversion of a document. "
    "First transcribe ALL visible text verbatim, keeping its original language and line breaks. "
    "Then describe the layout, UI elements, charts, tables or screenshots briefly. "
    "Do not invent content that is not in the image. Answer in the image's main language."
)


def docx_images(path):
    """Return (media members in document order, {member: bytes} within the size cap)."""
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        targets = {}
        rels_name = "word/_rels/document.xml.rels"
        # Parse the relationship part with a narrow regex: it is a flat list of
        # <Relationship Id=... Target=.../> elements, and this avoids handing
        # an untrusted DOCX to a general-purpose XML parser.
        if rels_name in names and archive.getinfo(rels_name).file_size <= MAX_RELS_BYTES:
            rels = archive.read(rels_name).decode("utf-8", "ignore")
            for rel in re.finditer(r"<Relationship\b([^>]*)/?>", rels):
                attrs = rel.group(1)
                rid = re.search(r'\bId="([^"]+)"', attrs)
                target_match = re.search(r'\bTarget="([^"]+)"', attrs)
                if rid is None or target_match is None:
                    continue
                target = target_match.group(1).replace("\\", "/")
                if "media/" not in target:
                    continue
                member = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("word", target))
                if member in names:
                    targets[rid.group(1)] = member
        if "word/document.xml" not in names:
            return [], {}
        document = archive.read("word/document.xml").decode("utf-8", "ignore")
        order = []
        for match in re.finditer(r'r:(?:embed|link)="([^"]+)"', document):
            member = targets.get(match.group(1))
            if member is not None:
                order.append(member)
        blobs = {}
        for member in set(order):
            if archive.getinfo(member).file_size <= MAX_IMAGE_BYTES:
                blobs[member] = archive.read(member)
        return order, blobs


def image_data_url(data, member):
    mime = mimetypes.guess_type(member)[0] or "image/png"
    return "data:%s;base64,%s" % (mime, base64.b64encode(data).decode("ascii"))


def describe_images(client, model, order, blobs):
    """Describe every distinct image once; per-image failures stay inline."""
    descriptions = {}
    members = list(dict.fromkeys(order))
    for member in members:
        if member not in blobs:
            descriptions[member] = "（图片超过 %d MiB，未描述）" % (MAX_IMAGE_BYTES // (1024 * 1024))

    def describe(member):
        if member in descriptions:
            return member, descriptions[member]
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": IMAGE_PROMPT},
                        {"type": "image_url", "image_url": {"url": image_data_url(blobs[member], member)}},
                    ],
                }],
            )
            text = (response.choices[0].message.content or "").strip()
            return member, text or "（模型没有返回描述）"
        except Exception as error:  # one bad image must not abort the whole conversion
            return member, "（图片描述失败：%s）" % error

    pending = [member for member in members if member in blobs]
    if pending:
        with ThreadPoolExecutor(max_workers=min(IMAGE_WORKERS, len(pending))) as pool:
            for member, description in pool.map(describe, pending):
                descriptions[member] = description
    return descriptions


def render_image(index, description):
    lines = description.splitlines() or [""]
    body = "\n".join(("> " + line) if line else ">" for line in lines)
    return "> **图 %d**\n%s" % (index, body)


def merge_docx_images(markdown, order, descriptions):
    """Replace each data-URI placeholder with the description of its image."""
    counter = {"n": 0}

    def replace(match):
        counter["n"] += 1
        index = counter["n"]
        if index > len(order):
            return match.group(0)
        description = descriptions.get(order[index - 1])
        if description is None:
            return match.group(0)
        return render_image(index, description)

    merged = IMAGE_MARKER.sub(replace, markdown)
    # More images in the document than placeholders in the Markdown: keep the
    # remaining descriptions rather than dropping them.
    extra = []
    for index in range(counter["n"] + 1, len(order) + 1):
        description = descriptions.get(order[index - 1])
        if description is not None:
            extra.append(render_image(index, description))
    if extra:
        merged = merged.rstrip() + "\n\n" + "\n\n".join(extra)
    return merged


def convert_with_images(client, model, target, extension):
    from markitdown import MarkItDown

    kwargs = {}
    if extension:
        kwargs["file_extension"] = extension
    markitdown = MarkItDown(llm_client=client, llm_model=model)
    markdown = markitdown.convert(target, **kwargs).text_content
    effective = (extension or os.path.splitext(target)[1].lstrip(".")).lower()
    if effective == "docx" and IMAGE_MARKER.search(markdown):
        order, blobs = docx_images(target)
        if order:
            descriptions = describe_images(client, model, order, blobs)
            markdown = merge_docx_images(markdown, order, descriptions)
    return markdown


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert one file or URL to Markdown with LLM image descriptions.")
    parser.add_argument("model", help="LLM model name, e.g. gpt-4o")
    parser.add_argument("api_key_env", help="Environment variable holding the API key")
    parser.add_argument("target", help="Absolute local path or http(s) URL")
    parser.add_argument("--extension", default=None, help="Optional file-extension hint")
    parser.add_argument("--base-url", default=None, help="Optional OpenAI-compatible endpoint URL")
    args = parser.parse_args()

    api_key = os.environ.get("DSH_MARKITDOWN_LLM_API_KEY") or os.environ.get(args.api_key_env)
    if not api_key:
        print(
            f"dsh-markitdown: no API key in DSH_MARKITDOWN_LLM_API_KEY or {args.api_key_env}; "
            "set it in Settings → MarkItDown or export it to enable LLM-assisted conversion",
            file=sys.stderr,
        )
        return 3
    try:
        from openai import OpenAI
    except ImportError:
        print(
            "dsh-markitdown: the openai package is missing; "
            "install it with: python -m pip install openai",
            file=sys.stderr,
        )
        return 4

    client_kwargs = {"api_key": api_key}
    if args.base_url:
        client_kwargs["base_url"] = args.base_url
    client = OpenAI(**client_kwargs)
    print(convert_with_images(client, args.model, args.target, args.extension))
    return 0


if __name__ == "__main__":
    sys.exit(main())
