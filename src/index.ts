/**
 * dsh-markitdown: Microsoft MarkItDown integration for DeepSeek Harness.
 *
 * One cordis plugin doing two things:
 * 1. registers model-facing tools that drive the MarkItDown Python CLI
 *    (`python -m markitdown`) to convert PDF / Office / HTML / images /
 *    audio and other files to Markdown;
 * 2. registers a bundled skill provider with a conversion workflow and
 *    troubleshooting notes written against those tools.
 *
 * Configuration (all optional, everything has a working default):
 * - command:      Python interpreter that has the `markitdown` package;
 *                 default `python`. On Windows without python on PATH use
 *                 `py` or an absolute interpreter path.
 * - timeoutMs:    per-conversion timeout; default 60000.
 * - maxInputBytes: maximum source file size; default 52428800 (50 MiB).
 * - maxOutputBytes: captured output cap per conversion; the CLI process is
 *                 killed past it; default 8388608 (8 MiB).
 * - allowedRoot:  optional containment root: source and output paths must
 *                 resolve inside it after following symlinks.
 * - llmModel:     enables LLM-assisted conversion (image descriptions via
 *                 the bundled helper); requires the openai package and the
 *                 API key in the llmApiKeyEnv environment variable.
 * - llmApiKeyEnv: environment variable holding the LLM API key; default
 *                 OPENAI_API_KEY.
 * - llmAllowUrls: allow URL sources in LLM mode (default off — internal
 *                 content must not leave the host through the LLM API).
 * - allowPlugins: permit third-party MarkItDown converter plugins (CLI -p);
 *                 an admin decision, not exposed as a per-call tool argument.
 * - allowPrivateUrls: allow URL sources resolving to loopback/private/
 *                 link-local addresses (default off; SSRF guard).
 * - assetRoot:    override the packaged skills directory (development).
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from './credentials-contract.js'
import { registerSkills } from './skills.js'
import { registerTools } from './tools.js'

/** Cordis plugin identity. */
export const name = 'dsh-markitdown'
/** Registries this plugin needs. */
export const inject = ['tools', 'skills', 'credentials']

/** Plugin configuration; every field is optional in the patch. */
export interface Config {
  /** Python interpreter with the `markitdown` package, e.g. `python`, `python3`, `py` or an absolute path. */
  command?: string
  /** Per-conversion timeout in milliseconds. */
  timeoutMs?: number
  /** Maximum source file size in bytes. */
  maxInputBytes?: number
  /** Captured output cap in bytes per conversion; the CLI is killed past it. */
  maxOutputBytes?: number
  /** Optional containment root for source and output paths (symlink-resolved). */
  allowedRoot?: string
  /** Model name enabling LLM-assisted conversion (image descriptions). */
  llmModel?: string
  /** OpenAI-compatible endpoint for LLM mode (e.g. https://api.deepseek.com/v1); empty = provider default. */
  llmBaseUrl?: string
  /** Credential reference (environment variable name) holding the LLM API key; default OPENAI_API_KEY. The dsh credential store takes precedence over the process environment. */
  llmApiKeyEnv?: string
  /** Allow URL sources in LLM mode; default false (internal content must not leave the host). */
  llmAllowUrls?: boolean
  /** Permit third-party MarkItDown converter plugins (CLI -p); default false. */
  allowPlugins?: boolean
  /** Permit URL sources resolving to loopback/private/link-local addresses; default false. */
  allowPrivateUrls?: boolean
  /** Absolute directory of bundled skills; defaults to the packaged assets. */
  assetRoot?: string
}

/** Schemastery configuration schema (fields optional unless marked required).
 *  The LLM fields are volatile: the dsh settings service only projects
 *  namespaces with at least one volatile field, and the settings tab edits
 *  these live without a plugin remount. */
export const Config = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().min(1000),
  maxInputBytes: z.number().min(1024),
  maxOutputBytes: z.number().min(65536),
  allowedRoot: z.string().min(1),
  llmModel: z.string().min(1).volatile(),
  llmBaseUrl: z.string().min(1).volatile(),
  llmApiKeyEnv: z.string().min(1).volatile(),
  llmAllowUrls: z.boolean(),
  allowPlugins: z.boolean(),
  allowPrivateUrls: z.boolean(),
  assetRoot: z.string().min(1),
})

/** Resolve configuration with defaults. */
export function resolveConfig(config: Config): {
  command: string
  timeoutMs: number
  maxInputBytes: number
  maxOutputBytes: number
  allowedRoot?: string
  llmModel?: string
  llmBaseUrl?: string
  llmApiKeyEnv: string
  llmAllowUrls: boolean
  allowPlugins: boolean
  allowPrivateUrls: boolean
  assetRoot?: string
} {
  const command = (config.command ?? 'python').trim()
  const timeoutMs = config.timeoutMs ?? 60000
  const maxInputBytes = config.maxInputBytes ?? 52428800
  const maxOutputBytes = config.maxOutputBytes ?? 8388608
  const llmApiKeyEnv = (config.llmApiKeyEnv ?? 'OPENAI_API_KEY').trim()
  if (command.length === 0) throw new Error('dsh-markitdown: command must not be empty')
  return {
    command,
    timeoutMs,
    maxInputBytes,
    maxOutputBytes,
    allowedRoot: config.allowedRoot,
    llmModel: config.llmModel,
    llmBaseUrl: config.llmBaseUrl,
    llmApiKeyEnv,
    llmAllowUrls: config.llmAllowUrls ?? false,
    allowPlugins: config.allowPlugins ?? false,
    allowPrivateUrls: config.allowPrivateUrls ?? false,
    assetRoot: config.assetRoot,
  }
}

/** Activate the plugin: tools plus the bundled skill provider. */
export function apply(ctx: Context, config: Config = {}): void {
  const resolved = resolveConfig(config)
  // Per-call resolution (never cached): the dsh credential store first, then
  // ambient fallbacks such as the process environment. A key set in
  // Settings → Plugins → MarkItDown reaches the next conversion without a
  // restart.
  const resolveApiKey = async (): Promise<string | undefined> =>
    (await ctx.credentials.resolve(resolved.llmApiKeyEnv))?.value
  registerTools(ctx, { ...resolved, resolveApiKey })
  registerSkills(ctx, 'dsh-markitdown', resolved.assetRoot)
}
