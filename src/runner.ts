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
import { lookup } from 'node:dns'
import { realpath, stat, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { request as httpRequest, IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isAbsolute, join, normalize, sep } from 'node:path'
import { tmpdir } from 'node:os'
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
  /**
   * Optional OpenAI-compatible endpoint for LLM mode (provider base URL).
   * Undefined uses the provider default.
   */
  readonly llmBaseUrl?: string
  /** Environment variable holding the LLM API key; default OPENAI_API_KEY. */
  readonly llmApiKeyEnv: string
  /**
   * Resolve the LLM API key at call time (never cached): the dsh credential
   * store first, then ambient fallbacks such as the process environment. The
   * ref name is `llmApiKeyEnv`.
   */
  readonly resolveApiKey: () => Promise<string | undefined>
  /**
   * LLM mode never accepts URL sources unless this is true: an internal
   * document fetched from a URL would leave the host through the LLM API.
   * Local file paths are unaffected.
   */
  readonly llmAllowUrls: boolean
  /** Allow third-party MarkItDown converter plugins (CLI -p); admin decision. */
  readonly allowPlugins: boolean
  /** Permit URL sources that resolve to loopback/private/link-local addresses. */
  readonly allowPrivateUrls: boolean
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

/** Optional MarkItDown CLI hints for one conversion. */
export interface ConvertHints {
  /** `-x`: file-extension hint (also enables otherwise-unknown local files and stdin input). */
  readonly extensionHint?: string
  /** `-m`: MIME-type hint. */
  readonly mimeHint?: string
  /** `-c`: charset hint (e.g. UTF-8 for text streams). */
  readonly charsetHint?: string
  /** `--keep-data-uris`: keep base64 image payloads in the output instead of truncating. */
  readonly keepDataUris?: boolean
}

/**
 * Extensions admitted via extensionHint beyond the built-in supported list:
 * text-shaped formats MarkItDown's plain-text converter handles. Keeps the
 * hint gate aligned with the allowlist instead of accepting arbitrary input.
 */
const HINTABLE_EXTENSIONS = new Set([
  'txt', 'log', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'rss', 'atom',
  'py', 'js', 'ts', 'css', 'sh',
])

/**
 * Validate one hinted extension: normalize (lowercase, strip one leading
 * dot), constrain the charset, and require membership in the supported or
 * hintable lists.
 */
export function sanitizeHintedExtension(hint: string): string {
  const normalized = hint.trim().toLowerCase().replace(/^\.+/, '')
  if (!/^[a-z0-9]{1,10}$/u.test(normalized)) {
    throw new MarkitdownError(`dsh-markitdown: extensionHint "${hint}" is not a safe extension name`)
  }
  if (!SUPPORTED_BY_EXT.has(normalized) && !HINTABLE_EXTENSIONS.has(normalized)) {
    throw new MarkitdownError(
      `dsh-markitdown: extensionHint ".${normalized}" is not supported or hintable. Supported: ${supportedExtensions().join(', ')}; hintable extras: ${[...HINTABLE_EXTENSIONS].join(', ')}.`,
    )
  }
  return normalized
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
function appendHintFlags(args: string[], hints: ConvertHints | undefined, connection: Connection): void {
  if ((hints?.extensionHint ?? '') !== '') args.push('-x', sanitizeHintedExtension(hints?.extensionHint as string))
  if ((hints?.mimeHint ?? '') !== '') args.push('-m', hints?.mimeHint as string)
  if ((hints?.charsetHint ?? '') !== '') args.push('-c', hints?.charsetHint as string)
  if (hints?.keepDataUris === true) args.push('--keep-data-uris')
  if (connection.allowPlugins) args.push('-p')
}

/** Spawn the interpreter with arguments and collect output under the timeout and output cap. */
async function run(connection: Connection, args: readonly string[], input?: Uint8Array): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    let child
    try {
      child = spawn(connection.command, args, {
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        // Python writes to a pipe in the locale code page (cp936 on Chinese
        // Windows) while the plugin decodes UTF-8, which turns every non-ASCII
        // character into mojibake; force UTF-8 for the child's stdio.
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      })
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
      // Windows exit code 9009 means "program not found": the configured
      // interpreter is missing, or PATH resolves to the Microsoft Store
      // `python` alias stub, which exits without running anything.
      if (code === 9009) {
        rejectPromise(new MarkitdownError(
          `dsh-markitdown: cannot run "${connection.command}" (exit code 9009 — the interpreter was not found or is a Microsoft Store alias stub).\n\n${setupGuidance(connection.command)}`,
        ))
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

/** IPv4 string to a 32-bit number for range checks. */
function ipv4ToNumber(address: string): number | undefined {
  const parts = address.split('.')
  if (parts.length !== 4) return undefined
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) return undefined
    const octet = Number(part)
    if (octet > 255) return undefined
    value = value * 256 + octet
  }
  return value
}

/**
 * True when an IP address is not globally routable (SSRF target).
 * IPv4-mapped/compatible IPv6 (::ffff:a.b.c.d, ::a.b.c.d) delegates to the
 * embedded IPv4 quad so mapped loopback/link-local cannot slip through.
 */
/** True when the host is a numeric IPv4 or IPv6 literal (not a DNS name). */
function isIpLiteral(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/u.test(hostname) || hostname.includes(':')
}

function isNonPublicAddress(address: string): boolean {
  if (address.includes(':')) {
    const compressed = address.toLowerCase().replace(/^\[/u, '').replace(/\]$/u, '')
    const mapped = /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/u.exec(compressed)
    if (mapped !== null) return isNonPublicAddress(mapped[1] as string)
    if (compressed === '::' || compressed === '::1') return true
    if (/^fe[89ab]/u.test(compressed)) return true // link-local fe80::/10
    if (compressed.startsWith('fc') || compressed.startsWith('fd')) return true // unique-local fc00::/7
    if (compressed.startsWith('fec')) return true // site-local fec0::/10 (deprecated)
    if (compressed.startsWith('2002:')) return true // 6to4 2002::/16 (embeds IPv4)
    if (compressed.startsWith('2001:')) return true // Teredo/benchmark 2001::/32
    if (/^64:ff9b:/u.test(compressed)) return true // NAT64 well-known 64:ff9b::/96
    return false
  }
  const value = ipv4ToNumber(address)
  if (value === undefined) return true // unparseable: refuse
  if (value >>> 24 === 0) return true // 0.0.0.0/8 unspecified + current network
  if (value >>> 24 === 10) return true // RFC1918
  if (value >>> 24 === 127) return true // loopback
  if ((value >>> 20) === 0xAC1) return true // 172.16.0.0/12 (0xAC1 = 172.16 >> 4)
  if ((value >>> 16) === 0xC0A8) return true // 192.168.0.0/16
  if ((value >>> 16) === 0xA9FE) return true // 169.254.0.0/16 link-local
  if ((value >>> 22) === (0x64400000 >>> 22)) return true // 100.64.0.0/10 CGNAT
  if ((value >>> 17) === (0xC6120000 >>> 17)) return true // 198.18.0.0/15 benchmark
  if ((value >>> 24) === 192 && ((value >>> 16) & 0xff) === 0) return true // 192.0.0.0/24 special (incl. NAT64 discovery)
  if ((value >>> 24) === 198 && ((value >>> 16) & 0xff) === 51) return true // 198.51.100.0/24 TEST-NET-2
  if ((value >>> 24) === 203 && ((value >>> 16) & 0xff) === 13) return true // 203.0.113.0/24 TEST-NET-3
  return false
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECT_HOPS = 5

/**
 * Connection-level DNS guard (SSRF / rebinding defence): a custom `lookup`
 * that returns only globally routable addresses. Every connection made by
 * {@link fetchUrlPinned} resolves through this hook, so the address that is
 * validated is the address that is connected to — no check-then-use gap.
 * When allowPrivateUrls is set the stock resolver is used instead.
 */
function pinnedLookup(connection: Connection) {
  if (connection.allowPrivateUrls) return undefined
  return (
    hostname: string,
    _options: unknown,
    callback: (error: NodeJS.ErrnoException | null, address?: string, family?: number) => void,
  ): void => {
    lookup(hostname, { all: true }, (error, addresses) => {
      if (error !== null) {
        callback(error as NodeJS.ErrnoException)
        return
      }
      const chosen = addresses.find(candidate => !isNonPublicAddress(candidate.address))
      if (chosen === undefined) {
        const refusal = new Error(`refused to connect to non-public address for host "${hostname}"`) as NodeJS.ErrnoException
        refusal.code = 'EPERM'
        callback(refusal)
        return
      }
      callback(null, chosen.address, chosen.family)
    })
  }
}

/**
 * Download one URL with pinned egress validation: every redirect hop is
 * followed manually, each connection resolves only to public addresses, the
 * scheme must stay http(s), credentials in the URL are rejected, and the
 * accumulated body is capped at maxInputBytes. Fails closed: a transport
 * error refuses the conversion instead of approving it silently.
 */
export async function fetchUrlPinned(connection: Connection, rawUrl: string): Promise<{ bytes: Uint8Array; finalUrl: string }> {
  let current = new URL(rawUrl)
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    if (current.username !== '' || current.password !== '') {
      throw new MarkitdownError('dsh-markitdown: URLs with embedded credentials are rejected')
    }
    if (!/^https?:$/iu.test(current.protocol)) {
      throw new MarkitdownError(`dsh-markitdown: URL scheme ${current.protocol} is not allowed`)
    }
    // IP-literal hosts never reach the lookup hook (Node connects directly),
    // so they are validated here instead of inside pinnedLookup.
    if (!connection.allowPrivateUrls && isIpLiteral(current.hostname) && isNonPublicAddress(current.hostname)) {
      throw new MarkitdownError(
        `dsh-markitdown: URL host "${current.hostname}" is a non-public address; set allowPrivateUrls to permit internal targets`,
      )
    }
    const transport = current.protocol === 'https:' ? httpsRequest : httpRequest
    const response = await new Promise<IncomingMessage>((resolvePromise, rejectPromise) => {
      const request = transport(current, { method: 'GET', lookup: pinnedLookup(connection) } as never, (message) => {
        resolvePromise(message)
      })
      request.setTimeout(Math.min(connection.timeoutMs, 15_000), () => {
        request.destroy(new Error('egress probe timed out'))
      })
      request.on('error', error => {
        rejectPromise(new MarkitdownError(`dsh-markitdown: cannot verify URL egress for ${current.href}: ${error.message}`))
      })
      request.end()
    })
    const location = response.headers.location
    if (!REDIRECT_STATUSES.has(response.statusCode ?? 0) || typeof location !== 'string' || location === '') {
      const chunks: Buffer[] = []
      let received = 0
      const body = await new Promise<Buffer>((resolvePromise, rejectPromise) => {
        response.on('data', (chunk: Buffer) => {
          received += chunk.byteLength
          if (received > connection.maxInputBytes) {
            rejectPromise(new MarkitdownError(`dsh-markitdown: URL body exceeded the ${connection.maxInputBytes} byte limit`))
            response.destroy()
            return
          }
          chunks.push(chunk)
        })
        response.on('end', () => resolvePromise(Buffer.concat(chunks)))
        response.on('error', error => rejectPromise(new MarkitdownError(`dsh-markitdown: failed reading URL body: ${error.message}`)))
      })
      return { bytes: new Uint8Array(body), finalUrl: current.href }
    }
    response.resume()
    current = new URL(location, current)
  }
  throw new MarkitdownError('dsh-markitdown: URL exceeded the redirect limit')
}

/** Hosts whose transcript converter needs the URL itself, not downloaded bytes. */
const URL_PASSTHROUGH_HOSTS = /(^|\.)youtube\.com$/iu

/** Convert downloaded URL bytes through a temporary file, then remove it. */
async function convertDownloaded(connection: Connection, bytes: Uint8Array, extension: string, hints: ConvertHints | undefined): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-markitdown-'))
  try {
    const target = join(directory, `download.${extension}`)
    await writeFile(target, bytes)
    const args = ['-m', 'markitdown']
    appendHintFlags(args, hints, connection)
    args.push(target)
    const { stdout } = await run(connection, args)
    return stdout
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Convert one http(s) source: download it with pinned egress validation and
 * convert the bytes from a temporary file, so MarkItDown never re-resolves
 * the host itself (no DNS-rebinding gap). YouTube is the documented
 * exception — its transcript converter requires the URL — and its connect
 * addresses were still pinned to public ranges at download time.
 */
export async function convertUrl(connection: Connection, source: string, hints: ConvertHints | undefined): Promise<string> {
  const { bytes, finalUrl } = await fetchUrlPinned(connection, source)
  const finalHost = new URL(finalUrl).hostname
  if (URL_PASSTHROUGH_HOSTS.test(finalHost) && (hints?.extensionHint ?? '') === '') {
    const args = ['-m', 'markitdown']
    appendHintFlags(args, hints, connection)
    args.push(source)
    const { stdout } = await run(connection, args)
    return stdout
  }
  const urlExtension = new URL(finalUrl).pathname.split('.').pop()?.toLowerCase() ?? ''
  if (SUPPORTED_BY_EXT.has(urlExtension)) return await convertDownloaded(connection, bytes, urlExtension, hints)
  if ((hints?.extensionHint ?? '') !== '') {
    return await convertDownloaded(connection, bytes, sanitizeHintedExtension(hints?.extensionHint as string), hints)
  }
  throw new MarkitdownError(
    `dsh-markitdown: cannot infer a converter for URL "${finalUrl}" (no recognizable extension); pass extensionHint.`,
  )
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
    appendHintFlags(args, hints, connection)
    // No positional argument: the MarkItDown CLI reads stdin when the
    // filename is empty (a literal '-' is treated as a file name).
    const { stdout } = await run(connection, args, new Uint8Array(decoded))
    return stdout
  }

  const source = spec.source
  if (source === undefined) throw new MarkitdownError('dsh-markitdown: nothing to convert — pass source or stdinBase64')

  if (isUrl(source)) {
    return await convertUrl(connection, source, hints)
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
  appendHintFlags(args, hints, connection)
  args.push(source)
  const { stdout } = await run(connection, args)
  return stdout
}

/**
 * Convert one source with LLM assistance (image descriptions instead of raw
 * data URIs) through the bundled helper. Requires the `openai` package and
 * the API key environment variable configured on the plugin. URL sources are
 * refused unless llmAllowUrls is set — internal content must never leave the
 * host through the LLM API by accident.
 */
export async function convertWithLlm(connection: Connection, spec: ConvertSpec): Promise<string> {
  if (connection.llmModel === undefined || connection.llmModel === '') {
    throw new MarkitdownError('dsh-markitdown: LLM-assisted conversion needs the llmModel config field')
  }
  if (spec.stdinBase64 !== undefined) throw new MarkitdownError('dsh-markitdown: LLM-assisted conversion does not support stdinBase64')
  const source = spec.source
  if (source === undefined) throw new MarkitdownError('dsh-markitdown: nothing to convert — pass source')
  let downloadedDir: string | undefined
  let effectiveSource = source
  try {
    if (isUrl(source)) {
      if (!connection.llmAllowUrls) {
        throw new MarkitdownError('dsh-markitdown: URL sources are disabled in LLM mode (internal content would leave the host); set llmAllowUrls to permit them')
      }
      const { bytes, finalUrl } = await fetchUrlPinned(connection, source)
      const extension = new URL(finalUrl).pathname.split('.').pop()?.toLowerCase() ?? 'bin'
      downloadedDir = await mkdtemp(join(tmpdir(), 'dsh-markitdown-'))
      effectiveSource = join(downloadedDir, `download.${extension}`)
      await writeFile(effectiveSource, bytes)
    } else {
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
    const apiKey = (await connection.resolveApiKey())?.trim()
    if (apiKey === undefined || apiKey === '') {
      throw new MarkitdownError(
        `dsh-markitdown: no API key behind "${connection.llmApiKeyEnv}" (credential store or environment). Set it in Settings → MarkItDown, or export the environment variable.`,
      )
    }
    const args = [llmHelperPath(), connection.llmModel, connection.llmApiKeyEnv, effectiveSource]
    if (connection.llmBaseUrl !== undefined && connection.llmBaseUrl !== '') args.push('--base-url', connection.llmBaseUrl)
    if ((spec.hints?.extensionHint ?? '') !== '') args.push('--extension', sanitizeHintedExtension(spec.hints?.extensionHint as string))
    const { stdout } = await run(connection, args)
    return stdout
  } finally {
    if (downloadedDir !== undefined) {
      await rm(downloadedDir, { recursive: true, force: true }).catch(() => {})
    }
  }
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
      const keyReady = ((await connection.resolveApiKey())?.trim() ?? '') !== ''
      try {
        await run(connection, ['-c', 'import openai'])
        detail += keyReady
          ? ` LLM-assisted conversion is configured (model ${connection.llmModel}, API key resolved from "${connection.llmApiKeyEnv}").`
          : ` LLM-assisted conversion is configured (model ${connection.llmModel}) but no API key is set behind "${connection.llmApiKeyEnv}" — add one in Settings → MarkItDown or export the environment variable.`
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
