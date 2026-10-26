---
name: markitdown
description: Convert PDF, Office, HTML, image, audio and other files to Markdown with the dsh-markitdown plugin (Microsoft MarkItDown). Use when the user asks to extract text or tables from a document, convert a file to Markdown, or make an attachment readable.
---

# MarkItDown document conversion

Convert files to Markdown through the plugin's `markitdown_check` and
`markitdown_convert` tools. MarkItDown runs as a Python package
(`python -m markitdown`) in the plugin's configured interpreter; the tools
own the process, timeout and error handling.

## Workflow

1. **Verify the environment once per session** with `markitdown_check`.
   - `ready: true` → continue.
   - `ready: false` → the detail field contains the exact setup command
     (`<command> -m pip install 'markitdown[all]'`). Show it to the user and
     stop; do not retry conversions until they confirm setup.
2. **Convert** with `markitdown_convert`:
   - Pass the absolute `path` of the source file.
   - Omit `output` to get the Markdown text inline — right for summaries,
     extraction questions and documents under ~100 KiB.
   - Pass absolute `output` (e.g. `<source>.md`) to write the result to a
     file — right for large documents, batch jobs and when the user asks
     for a converted file on disk.
3. **Report** what was converted, where the Markdown went, and any caveats
   below that apply to the source format.

## Supported inputs

PDF, DOCX/DOC, PPTX/PPT, XLSX/XLS/CSV (tables become Markdown tables),
JSON/XML, HTML/HTM, EPUB, MD, Outlook MSG, ZIP (each contained file
converted in place), JPG/JPEG/PNG/GIF/TIFF/BMP (EXIF metadata, OCR text
when available), WAV/MP3 (speech transcription, needs the `[all]` extra).

Anything else (e.g. `.exe`, `.sqlite`): refuse conversion and say the format
is not supported instead of guessing.

## Rules

- Always run `markitdown_check` before the first conversion in a session;
  a green check earlier in the conversation counts.
- Paths must be absolute and the file must exist; errors say which failed.
- Files above the configured size limit are rejected — suggest writing
  nothing and asking the user to split or shrink the file.
- Batch jobs: loop `markitdown_convert` one file at a time; do not parallelise
  (the converter process is the bottleneck and runs sequentially anyway).
- Do not install Python packages yourself unless the user explicitly asks;
  surface the setup command from `markitdown_check` and let them decide.

## Known limitations (set expectations)

- Scanned PDFs without a text layer convert to little or no text; say so
  instead of presenting an empty result as success.
- Complex layouts (multi-column, heavy styling) flatten into linear Markdown.
- Audio transcription quality depends on the `[all]` extra and its model
  downloads; check `markitdown_check` output when transcription matters.
- DOCX embedded images come back as data URIs and can be large; prefer the
  `output` file for those.
