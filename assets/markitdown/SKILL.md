---
name: markitdown
description: Convert PDF, Office, HTML, image, audio and other files, URLs, or stdin streams to Markdown with the dsh-markitdown plugin (Microsoft MarkItDown). Use when the user asks to extract text or tables from a document, convert a file or YouTube link to Markdown, or make an attachment readable.
---

# MarkItDown document conversion

Convert sources to Markdown through the plugin's `markitdown_check` and
`markitdown_convert` tools. MarkItDown runs as a Python package
(`python -m markitdown`) in the plugin's configured interpreter; the tools
own the process, timeout and error handling.

## Workflow

1. **Verify the environment once per session** with `markitdown_check`.
   - `ready: true` → continue.
   - `ready: false` → the detail field contains the exact setup command
     (`<command> -m pip install 'markitdown[all]'`). Show it to the user and
     stop; do not retry conversions until they confirm setup.
2. **Convert** with `markitdown_convert`. Pick the mode:
   - `path`: one absolute local file path or an http(s) URL (e.g. a YouTube
     link, when the `[all]` extra is installed).
   - `paths`: a batch (up to 16) of paths/URLs; per-source failures are
     captured in `results` and do not abort the batch.
   - `stdinBase64`: canonical base64 bytes; requires `extensionHint` or
     `mimeHint` so MarkItDown can pick a converter.
3. **Where the Markdown goes**:
   - Omit `output`/`outputDir` to get Markdown inline — right for summaries
     and sources under ~100 KiB.
   - `output` (single source) or `outputDir` (writes `<name>.md` per source)
     — right for large documents, batch jobs and when the user asks for
     converted files on disk.
4. **Report** what was converted, where the Markdown went, and any caveats
   below that apply to the source format.

## Hints and flags

`extensionHint` / `mimeHint` / `charsetHint` map to the MarkItDown CLI's
`-x` / `-m` / `-c` flags. `extensionHint` also admits local files whose
extension is not in the built-in supported list, and is required for stdin;
hinted extensions are validated against the supported list plus a small set
of plain-text formats (txt, log, yaml, yml, toml, ini, cfg, conf, rss, atom,
py, js, ts, css, sh). `keepDataUris` keeps base64 image payloads (by default
they are truncated). Third-party MarkItDown converter plugins (`-p`) run
only when the plugin admin enables `allowPlugins` in the plugin config.

## URL sources and egress

`path`/`paths` accept http(s) URLs (e.g. YouTube links). Every URL is
downloaded with connection-pinned egress validation before conversion: the
plugin resolves the host itself, connects only to a globally routable
address (the checked address is the connected address, so DNS rebinding
cannot swap targets mid-handshake), follows redirects manually with the
same check per hop, and hands the downloaded bytes to MarkItDown via a
temporary file — MarkItDown never re-resolves the host. Internal addresses
(loopback, private, link-local) are refused unless the admin sets
`allowPrivateUrls`. YouTube transcript URLs are the documented exception:
the URL itself is passed to MarkItDown (its converter requires it), still
after the same pinned connection check.

## LLM-assisted conversion

When the plugin config sets `llmModel`, conversions run through the bundled
helper with an OpenAI-compatible client: embedded images in Office documents
are described by the LLM instead of emitted as raw data URIs. Requirements:

- the `openai` package in the same Python environment
  (`<command> -m pip install openai`),
- the API key stored in the dsh credential store — Settings → Plugins →
  MarkItDown (provider preset, endpoint, model, key) — or exported in the
  `llmApiKeyEnv` environment variable (default `OPENAI_API_KEY`) as a
  fallback,
- awareness that image descriptions cost LLM tokens and add latency.

Any OpenAI-compatible provider works: pick the DeepSeek preset or set a
custom endpoint (`llmBaseUrl`) plus its model name.

`markitdown_check` reports whether the helper is ready. Without `llmModel`,
conversion stays fully offline and images appear as (truncated) data URIs.

## Supported local inputs

PDF, DOCX/DOC, PPTX/PPT, XLSX/XLS/CSV (tables become Markdown tables),
JSON/XML, HTML/HTM, EPUB, MD, Outlook MSG, ZIP (each contained file
converted in place), JPG/JPEG/PNG/GIF/TIFF/BMP (EXIF metadata, OCR text
when available), WAV/MP3 (speech transcription, needs the `[all]` extra).

Anything else: refuse conversion and say the format is not supported,
unless the user provides an `extensionHint` that MarkItDown understands.

## Rules

- Always run `markitdown_check` before the first conversion in a session;
  a green check earlier in the conversation counts.
- Local paths must be absolute and the file must exist; URLs must start
  with http(s)://. Errors say which check failed.
- Files above the configured size limit are rejected — suggest splitting
  or shrinking the file.
- Batch jobs run sequentially inside the tool; never fire several
  `markitdown_convert` calls in parallel for the same batch.
- Do not install Python packages yourself unless the user explicitly asks;
  surface the setup command from `markitdown_check` and let them decide.

## Known limitations (set expectations)

- Scanned PDFs without a text layer convert to little or no text; say so
  instead of presenting an empty result as success.
- Complex layouts (multi-column, heavy styling) flatten into linear Markdown.
- YouTube transcription depends on the `[all]` extra and current page
  structure; failures surface the MarkItDown error — report it, do not retry
  in a loop.
- DOCX embedded images come back as data URIs (or LLM descriptions in LLM
  mode) and can be large; prefer `output`/`outputDir` for those.
