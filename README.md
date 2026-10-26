# dsh-markitdown

[中文](README.zh.md) | Microsoft MarkItDown integration for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/DeepSeek-Harness).

Convert PDF, Office, HTML, images, audio and more to Markdown through
model-facing tools — no MCP, no bundled binaries. The plugin drives the
[`markitdown`](https://github.com/microsoft/markitdown) Python package
(`python -m markitdown`) in whichever Python interpreter you configure.

## What you get

- **`markitdown_check`** — probes the configured interpreter and reports the
  installed MarkItDown version (plus LLM-helper readiness when configured),
  or the exact setup command when something is missing.
- **`markitdown_convert`** — converts one source or a batch to Markdown:
  - `path`: one absolute local file path **or an http(s) URL** (e.g. a
    YouTube link with the `[all]` extra installed);
  - `paths`: batch of up to 16 paths/URLs, per-source failures captured;
  - `stdinBase64`: canonical base64 bytes via MarkItDown stdin (requires
    `extensionHint`/`mimeHint`);
  - hints map to the CLI: `extensionHint` (-x, also admits unlisted local
    extensions), `mimeHint` (-m), `charsetHint` (-c), `keepDataUris`; URL
    sources are downloaded with connection-pinned egress validation (the
    address that is checked is the address that is connected to — no
    DNS-rebinding gap) and converted from the downloaded bytes; loopback,
    private and link-local targets are refused unless `allowPrivateUrls`;
  - `output` writes the single-source result to a file, `outputDir` writes
    `<name>.md` per source; otherwise Markdown comes back inline.
- **LLM-assisted conversion** (config `llmModel`): embedded images in Office
  documents are described by an OpenAI-compatible LLM instead of emitted as
  data URIs. Ships the `python/llm_convert.py` helper; requires the `openai`
  package and the API key in `llmApiKeyEnv` (default `OPENAI_API_KEY`).
- **`markitdown` skill** — bundled workflow (environment check → convert →
  report caveats) with per-format expectations and known limitations.

Supported local inputs: PDF, DOCX/DOC, PPTX/PPT, XLSX/XLS, CSV, JSON, XML,
HTML/HTM, EPUB, MD, Outlook MSG, ZIP (contained files converted in place),
JPG/JPEG/PNG/GIF/TIFF/BMP (EXIF, OCR when available), WAV/MP3 (transcription,
needs the `[all]` extra).

## Install

Prerequisite: Python with MarkItDown installed in it:

```sh
python -m pip install 'markitdown[all]'
```

Install the plugin into dsh from the Git repository (any profile's Plugins
page → install from source, or the equivalent CLI command):

```
github:AlbertZJ/dsh-markitdown
```

## Configuration

All fields are optional; the defaults work when `python` on PATH has the
package.

```yaml
- name: 'dsh-markitdown'
  config:
    # Python interpreter running `-m markitdown`. On Windows where only the
    # launcher exists, use `py` or an absolute path, e.g.
    # C:/Users/you/AppData/Local/Programs/Python/Python312/python.exe
    command: python
    timeoutMs: 60000        # per-conversion deadline
    maxInputBytes: 52428800 # 50 MiB source limit
    maxOutputBytes: 8388608 # 8 MiB captured-output cap (process is killed past it)
    # Optional: keep all reads and writes inside one workspace. Paths are
    # resolved with symlinks followed and must stay under this root.
    # allowedRoot: D:/work/documents
    # Optional: LLM-assisted conversion (LLM-described embedded images).
    # Requires `pip install openai` and the key exported in the env var.
    # llmModel: gpt-4o
    # llmApiKeyEnv: OPENAI_API_KEY
    # Allow URL sources in LLM mode (default off: internal content must not
    # leave the host through the LLM API).
    # llmAllowUrls: false
    # Permit third-party MarkItDown converter plugins (CLI -p); default off.
    # allowPlugins: false
    # Allow URL sources resolving to loopback/private/link-local addresses
    # (default off; SSRF guard for URL conversion).
    # allowPrivateUrls: false
```

## Verify

```sh
pnpm install
pnpm run build
pnpm run verify   # structural checks (package, patch, skills, lib, locale)
```

`verify.mjs` needs no dependencies and also runs in CI on every push.

## Notes and limitations

- Conversion runs as a child process of the dsh host; the harness Bash
  approval flow does not gate it, so the plugin validates paths (absolute,
  existing, extension allow-list, size cap) before invoking MarkItDown.
- Scanned PDFs without a text layer convert to little or no text.
- Complex layouts flatten into linear Markdown; DOCX embedded images return
  as data URIs and can be large — use `output` for those.
- This plugin does not install Python packages by itself; run
  `markitdown_check` and follow its setup guidance.

## License

[MIT](LICENSE). MarkItDown itself is MIT-licensed by Microsoft and is *not*
bundled — install it into your Python environment as above.
