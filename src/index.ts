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
 * - llmProvider:  id of the active provider profile in `llmProviders`
 *                 (openai / deepseek / custom). When set, its profile alone
 *                 decides endpoint, model and key reference.
 * - llmProviders: per-provider profiles (`baseUrl`, `model`, `apiKeyEnv`),
 *                 so every provider keeps its own model and key reference.
 * - llmModel:     legacy single-provider model name; used only when
 *                 `llmProvider` is unset. Enables LLM-assisted conversion
 *                 (image descriptions via the bundled helper) and requires
 *                 the openai package plus an API key.
 * - llmApiKeyEnv: legacy key reference; environment variable holding the LLM
 *                 API key; default OPENAI_API_KEY.
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
import type { Connection } from './runner.js'
import { registerSkills } from './skills.js'
import { registerTools } from './tools.js'

/** Cordis plugin identity. */
export const name = 'dsh-markitdown'
/** Registries this plugin needs. */
export const inject = ['tools', 'skills', 'credentials']

/** One provider profile: endpoint, model and credential reference. */
export interface LlmProviderProfile {
  /** OpenAI-compatible endpoint; empty = provider default. */
  baseUrl?: string
  /** Model name; empty = LLM mode off for this provider. */
  model?: string
  /** Credential reference (environment variable name) holding this provider's key. */
  apiKeyEnv?: string
}

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
  /** Active provider profile id (a key of `llmProviders`); unset falls back to the legacy `llmModel` fields. */
  llmProvider?: string
  /** Per-provider profiles, keyed by provider id (openai / deepseek / custom); each keeps its own model and key reference. */
  llmProviders?: Record<string, LlmProviderProfile>
  /** Legacy single-provider model name; used only when `llmProvider` is unset. */
  llmModel?: string
  /** Legacy OpenAI-compatible endpoint; used only when `llmProvider` is unset. */
  llmBaseUrl?: string
  /** Legacy credential reference (environment variable name) holding the LLM API key; default OPENAI_API_KEY. */
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

/** One provider profile as stored under `llmProviders`. */
const LlmProviderProfileSchema = z.object({
  baseUrl: z.string(),
  model: z.string(),
  apiKeyEnv: z.string(),
})

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
  llmProvider: z.string().min(1).volatile(),
  llmProviders: z.dict(LlmProviderProfileSchema).volatile(),
  llmModel: z.string().min(1).volatile(),
  llmBaseUrl: z.string().min(1).volatile(),
  llmApiKeyEnv: z.string().min(1).volatile(),
  llmAllowUrls: z.boolean(),
  allowPlugins: z.boolean(),
  allowPrivateUrls: z.boolean(),
  assetRoot: z.string().min(1),
})

/** Shared protocol cosmokit uses for live configuration references. */
const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')

/**
 * Read one parsed config field. Volatile fields reach the plugin as runtime
 * references (their value only changes through the owning loader), so they
 * must be unwrapped before use; ordinary fields pass through unchanged.
 */
function readField<T>(value: T | undefined): T | undefined {
  if (value === null || typeof value !== 'object') return value
  if (!(VOLATILE_WRITE in (value as object))) return value
  return (value as unknown as { get(): T }).get()
}

/** Credential reference a provider profile falls back to when it names none. */
export function defaultKeyEnv(providerId: string | undefined): string {
  if (providerId === 'openai') return 'OPENAI_API_KEY'
  if (providerId === 'deepseek') return 'DEEPSEEK_API_KEY'
  if (providerId === 'custom') return 'MARKITDOWN_API_KEY'
  return 'OPENAI_API_KEY'
}

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
  // An explicitly chosen provider profile is the sole source for endpoint,
  // model and key reference; its empty model means LLM mode is off for that
  // provider rather than falling back to another provider's model.
  const providerId = readField(config.llmProvider)?.trim()
  const activeId = providerId === '' ? undefined : providerId
  const profiles = readField(config.llmProviders)
  const active = activeId === undefined ? undefined : profiles?.[activeId]
  const llmModel = (active === undefined ? readField(config.llmModel) : active.model)?.trim() || undefined
  const llmBaseUrl = (active === undefined ? readField(config.llmBaseUrl) : active.baseUrl)?.trim() || undefined
  const llmApiKeyEnv = ((active === undefined ? readField(config.llmApiKeyEnv) : active.apiKeyEnv)?.trim() || defaultKeyEnv(activeId))
  if (command.length === 0) throw new Error('dsh-markitdown: command must not be empty')
  return {
    command,
    timeoutMs,
    maxInputBytes,
    maxOutputBytes,
    allowedRoot: config.allowedRoot,
    llmModel,
    llmBaseUrl,
    llmApiKeyEnv,
    llmAllowUrls: config.llmAllowUrls ?? false,
    allowPlugins: config.allowPlugins ?? false,
    allowPrivateUrls: config.allowPrivateUrls ?? false,
    assetRoot: config.assetRoot,
  }
}

/** Activate the plugin: tools plus the bundled skill provider. */
export function apply(ctx: Context, config: Config = {}): void {
  // Ordinary fields are fixed for the mount lifetime; the provider selection
  // is resolved per call, so a change made in Settings → MarkItDown (which
  // updates the volatile references in place) reaches the next conversion
  // without a restart. The API key is read from the dsh credential store on
  // every call, environment fallbacks last.
  const base = resolveConfig(config)
  const connection: Connection = {
    command: base.command,
    timeoutMs: base.timeoutMs,
    maxInputBytes: base.maxInputBytes,
    maxOutputBytes: base.maxOutputBytes,
    allowedRoot: base.allowedRoot,
    get llmModel() { return resolveConfig(config).llmModel },
    get llmBaseUrl() { return resolveConfig(config).llmBaseUrl },
    get llmApiKeyEnv() { return resolveConfig(config).llmApiKeyEnv },
    resolveApiKey: async () => (await ctx.credentials.resolve(resolveConfig(config).llmApiKeyEnv))?.value,
    llmAllowUrls: base.llmAllowUrls,
    allowPlugins: base.allowPlugins,
    allowPrivateUrls: base.allowPrivateUrls,
  }
  registerTools(ctx, connection)
  registerSkills(ctx, 'dsh-markitdown', base.assetRoot)
}
