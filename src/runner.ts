/**
 * MarkItDown Python CLI runner.
 *
 * The plugin never links MarkItDown; it spawns the configured Python
 * interpreter as `python -m markitdown <args>` and captures stdout. Setup
 * failures (interpreter missing, package missing) map to actionable
 * guidance instead of raw spawn errors.
 *
 * LLM-assisted conversion (image descriptions instead of raw data URIs) is
 * API-only in MarkItDown, so it runs through the bundled helper script
 * `python/llm_convert.py`, which reads the API key from a named environment
 * variable — the key never enters the plugin configuration.
 */
import { spawn } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, normalize, sep } from 'node:path'
import { Buffer } from 'node:buffer'
import { fileURLToPath } from 'node:url'

/** Resolved runtime settings. */
export interface Connection {
  /** Python interpreter that runs `-m markitdown`. */
  readonly command: string
  /** Per-conversion timeout in milliseconds. */
  readonly timeoutMs: number
  /** Maximum source file size in bytes. */
  readonly maxInputBytes: number
  /**
   * Optional containment root: when set, both source paths and output paths
   * must resolve (after following symlinks) inside this directory. Use it to
   * keep the converter inside one workspace. URLs are not local paths and are
   * never containment-checked.
   */
  readonly allowedRoot?: string
  /** Maximum captured stdout/stderr per conversion; the process is killed past this. */
  readonly maxOutputBytes: number
  /** Optional model name enabling LLM-assisted conversion (image descriptions). */
  readonly llmModel?: string
  /** Environment variable holding the LLM API key; default OPENAI_API_KEY. */
  readonly llmApiKeyEnv: string
}

/** Error type surfaced to the model with setup guidance attached. */
export class MarkitdownError extends Error {
  override name = 'MarkitdownError'
}

/** Setup hint shown whenever the interpreter or package is missing. */
export function setupGuidance(command: string): string {
  return [
    `MarkItDown is not available under "${command}".`,
    'Install it into that Python environment with:',
    `  ${command} -m pip install 'markitdown[all]'`,
    "(the [all] extra enables optional PDF/audio/YouTube handlers; core conversions work with plain `markitdown`)",
    'Or point the plugin at another interpreter via the `command` config field.',
  ].join('\n')
}

/** One supported input format. */
export interface SupportedFormat {
  /** Lowercase extension without the dot. */
  readonly extension: string
  /** What MarkItDown extracts from it. */
  readonly extracts: string
}

/**
 * Formats accepted by `markitdown_convert` (Microsoft MarkItDown core
 * converters; optional extras widen audio/YouTube coverage).
 */
export const SUPPORTED_FORMATS: readonly SupportedFormat[] = [
  { extension: 'pdf', extracts: 'text content' },
  { extension: 'docx', extracts: 'paragraphs, tables, embedded images (as data URIs or LLM descriptions)' },
  { extension: 'doc', extracts: 'text content (legacy Word)' },
  { extension: 'pptx', extracts: 'slides with slide numbers' },
  { extension: 'ppt', extracts: 'slides (legacy PowerPoint)' },
  { extension: 'xlsx', extracts: 'sheets as Markdown tables' },
  { extension: 'xls', extracts: 'sheets as Markdown tables (legacy Excel)' },
  { extension: 'csv', extracts: 'rows as a Markdown table' },
  { extension: 'json', extracts: 'structured text' },
  { extension: 'xml', extracts: 'structured text' },
  { extension: 'html', extracts: 'main content as Markdown' },
  { extension: 'htm', extracts: 'main content as Markdown' },
  { extension: 'epub', extracts: 'chapters as Markdown' },
  { extension: 'md', extracts: 'passed through with front-matter kept' },
  { extension: 'msg', extracts: 'e-mail subject, body and headers (Outlook)' },
  { extension: 'zip', extracts: 'each contained file converted in place' },
  { extension: 'jpg', extracts: 'EXIF metadata and OCR text when available' },
  { extension: 'jpeg', extracts: 'EXIF metadata and OCR text when available' },
  { extension: 'png', extracts: 'EXIF metadata and OCR text when available' },
  { extension: 'gif', extracts: 'metadata' },
  { extension: 'tiff', extracts: 'EXIF metadata and OCR text when available' },
  { extension: 'bmp', extracts: 'metadata' },
  { extension: 'wav', extracts: 'speech transcription ([all] extra)' },
  { extension: 'mp3', extracts: 'speech transcription ([all] extra)' },
]

const SUPPORTED_BY_EXT = new Map(SUPPORTED_FORMATS.map(format => [format.extension, format]))

/** Supported extension list for tool descriptions. */
export function supportedExtensions(): string[] {
  return SUPPORTED_FORMATS.map(format => format.extension)
}

/** Optional MarkItDown CLI hints and feature flags for one conversion. */
export interface ConvertHints {
  /** `-x`: file-extension hint (also enables otherwise-unknown local files and stdin input). */
  readonly extensionHint?: string
  /** `-m`: MIME-type hint. */
  readonly mimeHint?: string
  /** `-c`: charset hint (e.g. UTF-8 for text streams). */
  readonly charsetHint?: string
  /** `--keep-data-uris`: keep base64 image payloads in the output instead of truncating. */
  readonly keepDataUris?: boolean
  /** `-p`: enable third-party MarkItDown converter plugins installed in the Python environment. */
  readonly usePlugins?: boolean
}

/** One conversion request: a local path, an http(s) URL, or stdin bytes. */
export interface ConvertSpec {
  /** Absolute local path or http(s) URL (e.g. a YouTube link). */
  readonly source?: string
  /** Canonical base64 bytes fed to MarkItDown stdin; requires an extension or MIME hint. */
  readonly stdinBase64?: string
  /** Optional CLI hints and feature flags. */
  readonly hints?: ConvertHints
}

/** Append the CLI flag form of every provided hint. */
function appendHintFlags(args: string[], hints: ConvertHints | undefined): void {
  if (hints?.extensionHint !== undefined && hints.extensionHint !== '') args.push('-x', hints.extensionHint)
  if (hints?.mimeHint !== undefined && hints.mimeHint !== '') args.push('-m', hints.mimeHint)
  if (hints?.charsetHint !== undefined && hints.charsetHint !== '') args.push('-c', hints.charsetHint)
  if (hints?.keepDataUris === true) args.push('--keep-data-uris')
  if (hints?.usePlugins === true) args.push('-p')
}

/** Spawn the interpreter with arguments and collect output under the timeout and output cap. */
async function run(connection: Connection, args: readonly string[], input?: Uint8Array): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    let child
    try {
      child = spawn(connection.command, args, { stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] })
    } catch (error) {
      rejectPromise(new MarkitdownError(`dsh-markitdown: failed to start "${connection.command}": ${(error as Error).message}\n\n${setupGuidance(connection.command)}`))
      return
    }
    let stdout = ''
    let stderr = ''
    let outputBytes = 0
    let killed = false
    const childStdout = child.stdout
    const childStderr = child.stderr
    if (childStdout === null || childStderr === null) {
      rejectPromise(new MarkitdownError(`dsh-markitdown: failed to capture output of "${connection.command}"`))
      return
    }
    const fail = (error: MarkitdownError) => {
      if (!killed) {
        killed = true
        child.kill('SIGKILL')
      }
      rejectPromise(error)
    }
    const timer = setTimeout(() => {
      fail(new MarkitdownError(`dsh-markitdown: "${connection.command}" conversion timed out after ${connection.timeoutMs} ms`))
    }, connection.timeoutMs)
    const watchOutput = (chunk: string) => {
      outputBytes += Buffer.byteLength(chunk)
      if (outputBytes > connection.maxOutputBytes) {
        fail(new MarkitdownError(`dsh-markitdown: conversion output exceeded ${connection.maxOutputBytes} bytes; pass an output file or raise maxOutputBytes`))
      }
    }
    childStdout.setEncoding('utf8')
    childStderr.setEncoding('utf8')
    childStdout.on('data', chunk => { watchOutput(chunk); stdout += chunk })
    childStderr.on('data', chunk => { watchOutput(chunk); stderr += chunk })
    child.on('error', error => {
      clearTimeout(timer)
      fail(new MarkitdownError(`dsh-markitdown: cannot run "${connection.command}": ${error.message}\n\n${setupGuidance(connection.command)}`))
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (killed) return
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }
      const detail = stderr.trim().split(/\r?\n/u).slice(-5).join('\n')
      if (detail.includes('No module named markitdown') || /ModuleNotFoundError/u.test(detail)) {
        rejectPromise(new MarkitdownError(`dsh-markitdown: the markitdown package is missing.\n\n${setupGuidance(connection.command)}`))
        return
      }
      rejectPromise(new MarkitdownError(`dsh-markitdown: markitdown exited with code ${code ?? 'unknown'}.\n${detail}`))
    })
    if (input !== undefined) {
      const childStdin = child.stdin
      if (childStdin === null) {
        fail(new MarkitdownError(`dsh-markitdown: failed to open stdin for "${connection.command}"`))
        return
      }
      childStdin.on('error', () => { /* E.g. EPIPE when the child dies early; close/error surfaces there. */ })
      childStdin.write(input)
      childStdin.end()
    }
  })
}

/** True when the source is an http(s) URL (e.g. a YouTube page). */
export function isUrl(source: string): boolean {
  return /^https?:\/\//iu.test(source)
}

/** Absolute path of the bundled LLM helper script. */
export function llmHelperPath(): string {
  return fileURLToPath(new URL('../python/llm_convert.py', import.meta.url))
}

/** Convert one source to Markdown through the MarkItDown CLI (`python -m markitdown`). */
export async function convertOne(connection: Connection, spec: ConvertSpec): Promise<string> {
  const hints = spec.hints
  const hasFormatHint = (hints?.extensionHint ?? '') !== '' || (hints?.mimeHint ?? '') !== ''

  if (spec.stdinBase64 !== undefined) {
    if (spec.source !== undefined) throw new MarkitdownError('dsh-markitdown: pass either source or stdinBase64, not both')
    if (!hasFormatHint) throw new MarkitdownError('dsh-markitdown: stdinBase64 requires an extensionHint or mimeHint so MarkItDown can pick a converter')
    const decoded = Buffer.from(spec.stdinBase64, 'base64')
    if (decoded.toString('base64') !== spec.stdinBase64) {
      throw new MarkitdownError('dsh-markitdown: stdinBase64 is not canonical base64')
    }
    if (decoded.byteLength > connection.maxInputBytes) {
      throw new MarkitdownError(`dsh-markitdown: stdin payload is ${decoded.byteLength} bytes, above the ${connection.maxInputBytes} byte limit`)
    }
    const args = ['-m', 'markitdown']
    appendHintFlags(args, hints)
    // No positional argument: the MarkItDown CLI reads stdin when the
    // filename is empty (a literal '-' is treated as a file name).
    const { stdout } = await run(connection, args, new Uint8Array(decoded))
    return stdout
  }

  const source = spec.source
  if (source === undefined) throw new MarkitdownError('dsh-markitdown: nothing to convert — pass source or stdinBase64')

  if (isUrl(source)) {
    const args = ['-m', 'markitdown']
    appendHintFlags(args, hints)
    args.push(source)
    const { stdout } = await run(connection, args)
    return stdout
  }

  if (!isAbsolute(source)) throw new MarkitdownError(`dsh-markitdown: path must be absolute, got "${source}"`)
  if (connection.allowedRoot !== undefined) await assertInsideRoot(connection.allowedRoot, source, 'source')
  const extension = source.split('.').pop()?.toLowerCase() ?? ''
  if (!hasFormatHint && !SUPPORTED_BY_EXT.has(extension)) {
    throw new MarkitdownError(
      `dsh-markitdown: ".${extension}" is not a MarkItDown input. Supported: ${supportedExtensions().map(ext => `.${ext}`).join(', ')}. Pass an extensionHint for unlisted formats.`,
    )
  }
  let size: number
  try {
    size = (await stat(source)).size
  } catch {
    throw new MarkitdownError(`dsh-markitdown: cannot read "${source}" (file missing or not readable)`)
  }
  if (size > connection.maxInputBytes) {
    throw new MarkitdownError(`dsh-markitdown: "${source}" is ${size} bytes, above the ${connection.maxInputBytes} byte limit`)
  }
  const args = ['-m', 'markitdown']
  appendHintFlags(args, hints)
  args.push(source)
  const { stdout } = await run(connection, args)
  return stdout
}

/**
 * Convert one source with LLM assistance (image descriptions instead of raw
 * data URIs) through the bundled helper. Requires the `openai` package and
 * the API key environment variable configured on the plugin.
 */
export async function convertWithLlm(connection: Connection, spec: ConvertSpec): Promise<string> {
  if (connection.llmModel === undefined || connection.llmModel === '') {
    throw new MarkitdownError('dsh-markitdown: LLM-assisted conversion needs the llmModel config field')
  }
  if (spec.stdinBase64 !== undefined) throw new MarkitdownError('dsh-markitdown: LLM-assisted conversion does not support stdinBase64')
  const source = spec.source
  if (source === undefined) throw new MarkitdownError('dsh-markitdown: nothing to convert — pass source')
  if (!isUrl(source)) {
    if (!isAbsolute(source)) throw new MarkitdownError(`dsh-markitdown: path must be absolute, got "${source}"`)
    if (connection.allowedRoot !== undefined) await assertInsideRoot(connection.allowedRoot, source, 'source')
    try {
      const size = (await stat(source)).size
      if (size > connection.maxInputBytes) throw new MarkitdownError(`dsh-markitdown: "${source}" is ${size} bytes, above the ${connection.maxInputBytes} byte limit`)
    } catch (error) {
      if (error instanceof MarkitdownError) throw error
      throw new MarkitdownError(`dsh-markitdown: cannot read "${source}" (file missing or not readable)`)
    }
  }
  const apiKey = process.env[connection.llmApiKeyEnv]?.trim()
  if (apiKey === undefined || apiKey === '') {
    throw new MarkitdownError(
      `dsh-markitdown: environment variable ${connection.llmApiKeyEnv} is not set. Export it (or pick another name via llmApiKeyEnv) to enable LLM-assisted conversion.`,
    )
  }
  const args = [llmHelperPath(), connection.llmModel, connection.llmApiKeyEnv, source]
  if ((spec.hints?.extensionHint ?? '') !== '') args.push('--extension', spec.hints?.extensionHint as string)
  const { stdout } = await run(connection, args)
  return stdout
}

/** Per-source outcome of one batch conversion. */
export interface ConvertResult {
  /** The source that produced this outcome. */
  readonly source: string
  /** Converted Markdown, when the source succeeded and no output file was requested. */
  readonly markdown?: string
  /** Error message for this source; other sources in the same batch still convert. */
  readonly error?: string
}

/**
 * Convert sources one at a time (the converter process is the bottleneck, so
 * no parallelism). Per-source failures are captured on the result instead of
 * aborting the batch.
 */
export async function convertBatch(connection: Connection, specs: readonly ConvertSpec[]): Promise<ConvertResult[]> {
  const results: ConvertResult[] = []
  for (const spec of specs) {
    const source = spec.stdinBase64 !== undefined ? '(stdin)' : spec.source ?? '(unknown)'
    try {
      const markdown = connection.llmModel !== undefined
        ? await convertWithLlm(connection, spec)
        : await convertOne(connection, spec)
      results.push({ source, markdown })
    } catch (error) {
      results.push({ source, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return results
}

/** Probe the environment and report whether conversions are ready. */
export async function checkEnvironment(connection: Connection): Promise<{ command: string; ready: boolean; version?: string; detail: string }> {
  try {
    const probe = await run(connection, ['-c', 'import importlib.metadata as m; print(m.version("markitdown"))'])
    const version = probe.stdout.trim()
    let detail = `markitdown ${version} is available under "${connection.command}".`
    if (connection.llmModel !== undefined) {
      try {
        await run(connection, ['-c', 'import openai'])
        detail += ` LLM-assisted conversion is configured (model ${connection.llmModel}, API key from ${connection.llmApiKeyEnv}).`
      } catch {
        detail += ` LLM-assisted conversion is configured (model ${connection.llmModel}) but the openai package is missing — run: ${connection.command} -m pip install openai`
      }
    }
    return { command: connection.command, ready: true, version, detail }
  } catch (error) {
    if (error instanceof MarkitdownError) {
      return { command: connection.command, ready: false, detail: error.message }
    }
    throw error
  }
}

/**
 * Resolve `target` with symlinks followed as far as the path exists; the
 * non-existent tail is kept verbatim under the nearest existing ancestor and
 * lexically normalized, so `..` segments collapse the way the OS will resolve
 * them once ancestors are created.
 */
async function realpathBestEffort(target: string): Promise<string> {
  const parts = target.split(sep).filter(part => part.length > 0)
  const prefix = target.startsWith(sep) ? sep : ''
  for (let depth = parts.length; depth >= 1; depth -= 1) {
    const head = prefix + parts.slice(0, depth).join(sep)
    try {
      const resolved = await realpath(head)
      return depth === parts.length ? resolved : normalize(join(resolved, parts.slice(depth).join(sep)))
    } catch {
      // ancestor missing; keep walking up
    }
  }
  return normalize(target)
}

/** Normalize a resolved path for containment comparison. Backslashes are
 * translated to separators only on Windows, where they are separators; on
 * POSIX they are ordinary filename bytes and must stay untouched. */
function normalizeForCompare(path: string): string {
  if (process.platform === 'win32') return path.replace(/\\/gu, '/').toLowerCase()
  return path
}

/**
 * Ensure `target` resolves (after following symlinks) inside `root`.
 * Works for existing and not-yet-existing paths; used for both read sources
 * and output destinations.
 * @param root - Containment root (absolute).
 * @param target - Path to check (absolute).
 * @param role - 'source' or 'output', used in the error message.
 */
export async function assertInsideRoot(root: string, target: string, role: string): Promise<void> {
  if (!isAbsolute(root)) throw new MarkitdownError(`dsh-markitdown: allowedRoot must be absolute, got "${root}"`)
  if (!isAbsolute(target)) throw new MarkitdownError(`dsh-markitdown: ${role} path must be absolute, got "${target}"`)
  const [rootReal, targetReal] = await Promise.all([realpath(root), realpathBestEffort(target)])
  const rootNorm = normalizeForCompare(rootReal).replace(/\/+$/u, '')
  const targetNorm = normalizeForCompare(targetReal)
  if (targetNorm !== rootNorm && !targetNorm.startsWith(rootNorm + '/')) {
    throw new MarkitdownError(`dsh-markitdown: ${role} path "${target}" resolves to "${targetReal}", outside allowedRoot "${rootReal}"`)
  }
}
