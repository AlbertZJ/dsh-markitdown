# dsh-markitdown

[中文](README.zh.md) | Microsoft MarkItDown integration for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/DeepSeek-Harness).

Convert PDF, Office, HTML, images, audio and more to Markdown through
model-facing tools — no MCP, no bundled binaries. The plugin drives the
[`markitdown`](https://github.com/microsoft/markitdown) Python package
(`python -m markitdown`) in whichever Python interpreter you configure.

## What you get

- **`markitdown_check`** — probes the configured interpreter and reports the
  installed MarkItDown version, or the exact setup command when it is missing.
- **`markitdown_convert`** — converts one supported file to Markdown and
  returns the text inline, or writes it to a file you name (`output`).
- **`markitdown` skill** — bundled workflow (environment check → convert →
  report caveats) with per-format expectations and known limitations.

Supported inputs: PDF, DOCX/DOC, PPTX/PPT, XLSX/XLS, CSV, JSON, XML,
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
