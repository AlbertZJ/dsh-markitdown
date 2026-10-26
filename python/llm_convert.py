"""LLM-assisted MarkItDown conversion for the dsh-markitdown plugin.

MarkItDown's LLM integration (describing embedded images instead of
emitting raw data URIs) is only exposed through its Python API, so the
plugin ships this helper and spawns it with the configured interpreter.
The API key is read from a named environment variable here; it never
passes through the plugin configuration or argv.

Usage: llm_convert.py <model> <api_key_env> <target> [--extension EXT]
"""

import argparse
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert one file or URL to Markdown with LLM image descriptions.")
    parser.add_argument("model", help="LLM model name, e.g. gpt-4o")
    parser.add_argument("api_key_env", help="Environment variable holding the API key")
    parser.add_argument("target", help="Absolute local path or http(s) URL")
    parser.add_argument("--extension", default=None, help="Optional file-extension hint")
    args = parser.parse_args()

    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        print(
            f"dsh-markitdown: environment variable {args.api_key_env} is not set; "
            "export it to enable LLM-assisted conversion",
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
    from markitdown import MarkItDown

    client = OpenAI(api_key=api_key)
    markitdown = MarkItDown(llm_client=client, llm_model=args.model)
    kwargs = {}
    if args.extension:
        kwargs["file_extension"] = args.extension
    result = markitdown.convert(args.target, **kwargs)
    print(result.text_content)
    return 0


if __name__ == "__main__":
    sys.exit(main())
