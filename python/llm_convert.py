"""MarkItDown conversion helper for the dsh-markitdown plugin.

Two jobs, one process:

1. DOCX images are exported out of the package into files next to the
   Markdown and referenced by path, so the session can open each original
   (`read_image`) instead of trusting a one-shot description. This runs
   without any model or API key.
2. Optionally (`--describe`) the same multimodal model describes each image
   and the text is kept beside the link. The key arrives in a fixed internal
   environment variable the plugin injects after resolving it from the dsh
   credential store; the named variable is only a fallback for keys the user
   exported themselves. The key never passes through the plugin
   configuration or argv.

MarkItDown's LLM integration is only exposed through its Python API, and
markitdown 0.1.x does not route Word images through it
(`_docx_converter._image_to_html` returns None): a .docx always yields
`![](data:image/...;base64...)` placeholders. This helper extracts
`word/media` images in document order, exports them (and optionally
describes each one), and replaces the placeholders in place. Other formats
keep markitdown's native behavior (PPTX and image files already use the LLM
client when descriptions are enabled).

Usage: llm_convert.py <target> [--extension EXT] [--media-dir DIR]
       [--media-link-prefix PREFIX] [--describe --model MODEL
       [--api-key-env ENV] [--base-url URL]]
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

# Skip absurdly large embedded images rather than exporting or sending them.
MAX_IMAGE_BYTES = 8 * 1024 * 1024

# The relationship part is a few KiB in practice; cap it before decoding.
MAX_RELS_BYTES = 4 * 1024 * 1024

# Enough parallelism to keep a many-image document well inside the plugin's
# per-conversion timeout, while staying gentle on provider rate limits.
IMAGE_WORKERS = 4

# Exported files are named by us, but the extension comes from the archive
# member; keep it a short alphanumeric suffix so a crafted DOCX cannot escape
# the media directory.
SAFE_EXTENSION = re.compile(r"\.[a-z0-9]{1,5}\Z")

IMAGE_PROMPT = (
    "You are extracting evidence from one image embedded in a document.\n"
    "1. Transcribe every visible text exactly as written, preserving line breaks and punctuation. "
    "Write [unreadable] for text you cannot read; never guess it.\n"
    "2. Do not infer or add anything that is not visible. Do not name apps, platforms, companies, "
    "people, or dates unless the image text states them; never write 'likely', 'probably', or a guess.\n"
    "3. For chat or message screenshots, attribute each message only from what is visible "
    "(bubble side, avatar, sender label). If the sender is not determinable, write "
    "'sender unclear' instead of picking one.\n"
    "4. Reproduce tables as Markdown tables.\n"
    "5. End with one line 'layout:' summarizing the layout.\n"
    "6. Answer in the main language of the image text."
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
                # Deterministic decoding: the same image must yield the same
                # description across runs (and across the plugin's retries).
                temperature=0,
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


def export_images(order, blobs, media_dir, link_prefix):
    """Write each distinct embedded image under media_dir; return {member: link}."""
    os.makedirs(media_dir, exist_ok=True)
    prefix = (link_prefix or "").rstrip("/")
    links = {}
    index = 0
    for member in dict.fromkeys(order):
        if member not in blobs:
            continue
        index += 1
        extension = posixpath.splitext(member)[1].lower()
        if not SAFE_EXTENSION.match(extension):
            extension = ".bin"
        filename = "image%d%s" % (index, extension)
        with open(os.path.join(media_dir, filename), "wb") as handle:
            handle.write(blobs[member])
        links[member] = "%s/%s" % (prefix, filename) if prefix else filename
    return links


def render_description(index, description, member=None):
    # Name the source part so the reader can inspect the original image when
    # a description looks wrong.
    source = ("（%s）" % member) if member else ""
    lines = description.splitlines() or [""]
    body = "\n".join(("> " + line) if line else ">" for line in lines)
    return "> **图 %d**%s\n%s" % (index, source, body)


def render_image(index, link, description=None, member=None):
    """Image link first (the session can open the original), description after."""
    head = "![图 %d](%s)" % (index, link)
    if description is None:
        return head
    return "%s\n\n%s" % (head, render_description(index, description, member))


def merge_docx_images(markdown, order, descriptions, links):
    """Replace each data-URI placeholder with its exported image and/or description."""
    counter = {"n": 0}

    def replace(match):
        counter["n"] += 1
        index = counter["n"]
        if index > len(order):
            return match.group(0)
        member = order[index - 1]
        link = links.get(member)
        description = descriptions.get(member)
        if link is not None:
            return render_image(index, link, description, member)
        if description is not None:
            return render_description(index, description, member)
        # Above the size cap: say so instead of keeping a base64 blob inline.
        return "> **图 %d**（%s）\n> 图片超过 %d MiB，未导出" % (
            index, member, MAX_IMAGE_BYTES // (1024 * 1024))

    merged = IMAGE_MARKER.sub(replace, markdown)
    # More images in the document than placeholders in the Markdown: keep the
    # remaining images/descriptions rather than dropping them.
    extra = []
    for index in range(counter["n"] + 1, len(order) + 1):
        member = order[index - 1]
        link = links.get(member)
        description = descriptions.get(member)
        if link is not None:
            extra.append(render_image(index, link, description, member))
        elif description is not None:
            extra.append(render_description(index, description, member))
    if extra:
        merged = merged.rstrip() + "\n\n" + "\n\n".join(extra)
    return merged


def convert_with_images(client, model, target, extension, media_dir=None, link_prefix="", describe=False):
    from markitdown import MarkItDown

    kwargs = {}
    if extension:
        kwargs["file_extension"] = extension
    if describe:
        markitdown = MarkItDown(llm_client=client, llm_model=model)
    else:
        markitdown = MarkItDown()
    markdown = markitdown.convert(target, **kwargs).text_content
    effective = (extension or os.path.splitext(target)[1].lstrip(".")).lower()
    if effective != "docx" or not IMAGE_MARKER.search(markdown):
        return markdown
    order, blobs = docx_images(target)
    if not order:
        return markdown
    links = export_images(order, blobs, media_dir, link_prefix) if media_dir else {}
    descriptions = describe_images(client, model, order, blobs) if describe else {}
    if not links and not descriptions:
        return markdown
    return merge_docx_images(markdown, order, descriptions, links)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert one file or URL to Markdown; export DOCX images and optionally describe them.")
    parser.add_argument("target", help="Absolute local path or http(s) URL")
    parser.add_argument("--extension", default=None, help="Optional file-extension hint")
    parser.add_argument("--base-url", default=None, help="Optional OpenAI-compatible endpoint URL")
    parser.add_argument("--model", default=None, help="Vision model name (required with --describe)")
    parser.add_argument("--api-key-env", default="OPENAI_API_KEY",
                        help="Fallback environment variable holding the API key")
    parser.add_argument("--describe", action="store_true",
                        help="Describe each DOCX image with the multimodal model")
    parser.add_argument("--media-dir", default=None,
                        help="Directory to export DOCX images into (created when missing)")
    parser.add_argument("--media-link-prefix", default="",
                        help="Prefix used in Markdown links to the exported images")
    args = parser.parse_args()

    client = None
    if args.describe:
        if not args.model:
            print("dsh-markitdown: --describe needs --model", file=sys.stderr)
            return 2
        api_key = os.environ.get("DSH_MARKITDOWN_LLM_API_KEY") or os.environ.get(args.api_key_env)
        if not api_key:
            print(
                f"dsh-markitdown: no API key in DSH_MARKITDOWN_LLM_API_KEY or {args.api_key_env}; "
                "set it in Settings → MarkItDown or export it to enable image descriptions",
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

    print(convert_with_images(
        client, args.model, args.target, args.extension,
        args.media_dir, args.media_link_prefix, args.describe,
    ))
    return 0


if __name__ == "__main__":
    sys.exit(main())
