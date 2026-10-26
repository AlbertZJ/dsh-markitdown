/**
 * MarkItDown Python CLI runner.
 *
 * The plugin never links MarkItDown; it spawns the configured Python
 * interpreter as `python -m markitdown <args>` and captures stdout. Setup
 * failures (interpreter missing, package missing) map to actionable
 * guidance instead of raw spawn errors.
 */
import { spawn } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, sep } from 'node:path'

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
   * keep the converter inside one workspace.
   */
  readonly allowedRoot?: string
  /** Maximum captured stdout/stderr per conversion; the process is killed past this. */
  readonly maxOutputBytes: number
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
  { extension: 'docx', extracts: 'paragraphs, tables, embedded images (as data URIs)' },
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

/** Spawn the interpreter with arguments and collect output under the timeout and output cap. */
async function run(connection: Connection, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    let child
    try {
      child = spawn(connection.command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      rejectPromise(new MarkitdownError(`dsh-markitdown: failed to start "${connection.command}": ${(error as Error).message}\n\n${setupGuidance(connection.command)}`))
      return
    }
    let stdout = ''
    let stderr = ''
    let outputBytes = 0
    let killed = false
    const fail = (error: MarkitdownError) => {
      if (!killed) {
        killed = true
        child.kill('SIGKILL')
      }
      rejectPromise(error)
    }
    const timer = setTimeout(() => {
      fail(new MarkitdownError(`dsh-markitdown: "${connection.command} -m markitdown" timed out after ${connection.timeoutMs} ms`))
    }, connection.timeoutMs)
    const watchOutput = (chunk: string) => {
      outputBytes += Buffer.byteLength(chunk)
      if (outputBytes > connection.maxOutputBytes) {
        fail(new MarkitdownError(`dsh-markitdown: conversion output exceeded ${connection.maxOutputBytes} bytes; pass an output file or raise maxOutputBytes`))
      }
    }
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { watchOutput(chunk); stdout += chunk })
    child.stderr.on('data', chunk => { watchOutput(chunk); stderr += chunk })
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
  })
}

/** Probe the environment and report whether conversions are ready. */
export async function checkEnvironment(connection: Connection): Promise<{ command: string; ready: boolean; version?: string; detail: string }> {
  try {
    const probe = await run(connection, ['-c', 'import importlib.metadata as m; print(m.version("markitdown"))'])
    const version = probe.stdout.trim()
    return { command: connection.command, ready: true, version, detail: `markitdown ${version} is available under "${connection.command}".` }
  } catch (error) {
    if (error instanceof MarkitdownError) {
      return { command: connection.command, ready: false, detail: error.message }
    }
    throw error
  }
}

/**
 * Resolve `target` with symlinks followed as far as the path exists
 * (non-existent tails are kept verbatim after the nearest existing ancestor).
 */
async function realpathBestEffort(target: string): Promise<string> {
  const parts = target.split(sep).filter(part => part.length > 0)
  const prefix = target.startsWith(sep) ? sep : ''
  for (let depth = parts.length; depth >= 1; depth -= 1) {
    const head = prefix + parts.slice(0, depth).join(sep)
    try {
      const resolved = await realpath(head)
      return depth === parts.length ? resolved : join(resolved, parts.slice(depth).join(sep))
    } catch {
      // ancestor missing; keep walking up
    }
  }
  return target
}

/** Normalize a resolved path for containment comparison (Windows separators and case). */
function normalizeForCompare(path: string): string {
  const normalized = path.replace(/\\/gu, '/')
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
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

/**
 * Convert one file to Markdown through `python -m markitdown`.
 * @param connection - Resolved runtime settings.
 * @param path - Absolute source file path.
 * @returns The Markdown text on stdout.
 */
export async function convertFile(connection: Connection, path: string): Promise<string> {
  if (!isAbsolute(path)) throw new MarkitdownError(`dsh-markitdown: path must be absolute, got "${path}"`)
  if (connection.allowedRoot !== undefined) await assertInsideRoot(connection.allowedRoot, path, 'source')
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  if (!SUPPORTED_BY_EXT.has(extension)) {
    throw new MarkitdownError(
      `dsh-markitdown: ".${extension}" is not a MarkItDown input. Supported: ${supportedExtensions().map(ext => `.${ext}`).join(', ')}.`,
    )
  }
  let size: number
  try {
    size = (await stat(path)).size
  } catch {
    throw new MarkitdownError(`dsh-markitdown: cannot read "${path}" (file missing or not readable)`)
  }
  if (size > connection.maxInputBytes) {
    throw new MarkitdownError(`dsh-markitdown: "${path}" is ${size} bytes, above the ${connection.maxInputBytes} byte limit`)
  }
  const { stdout } = await run(connection, ['-m', 'markitdown', path])
  return stdout
}
