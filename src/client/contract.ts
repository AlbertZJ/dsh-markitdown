/**
 * Shared contract of the MarkItDown settings page: the host entry namespace
 * it configures, the provider profiles it edits, and the state surface the
 * page renders.
 */

/** Host cordis entry id the plugin's bundle patch installs. */
export const ENTRY_ID = 'markitdown'

/** Selectable provider ids; each keeps its own model and credential reference. */
export type ProviderId = 'openai' | 'deepseek' | 'custom'

/** One provider profile the page edits. */
export interface LlmProviderPreset {
  /** Stable selection key. */
  readonly id: ProviderId
  /** Provider base URL written into the profile. */
  readonly baseUrl: string
  /** Credential reference the provider's key is stored under. */
  readonly apiKeyEnv: string
}

/** Provider presets the page offers; `custom` starts with an empty endpoint. */
export const LLM_PROVIDER_PRESETS: readonly LlmProviderPreset[] = [
  { id: 'openai', baseUrl: 'https://api.openai.com/v1', apiKeyEnv: 'OPENAI_API_KEY' },
  { id: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  { id: 'custom', baseUrl: '', apiKeyEnv: 'MARKITDOWN_API_KEY' },
]

/** Profile field the page can write. */
export type ProviderField = 'model' | 'baseUrl'

/** One provider's rendered state. */
export interface MarkitdownProviderState {
  readonly id: ProviderId
  /** Whether this provider is the one conversions currently use. */
  readonly active: boolean
  /** Model configured for this provider (empty = LLM mode off for it). */
  readonly model: string
  /** Endpoint configured for this provider (empty = preset default). */
  readonly baseUrl: string
  /** Credential reference this provider's key is stored under. */
  readonly apiKeyEnv: string
  /** Whether the reference holds a secret; undefined while checking. */
  readonly keyConfigured: boolean | undefined
}

/** Transient outcome the page reports after a write attempt. */
export type MarkitdownSettingsNotice =
  | { kind: 'saved' | 'failed'; provider: ProviderId; field: ProviderField }
  | { kind: 'activated' | 'activateFailed' | 'deactivated'; provider: ProviderId }
  | { kind: 'keySaved' | 'keyCleared' | 'keyFailed'; provider: ProviderId }
  | { kind: 'describeSaved' | 'describeFailed' }

/** What the settings page renders. */
export interface MarkitdownSettingsState {
  /** ready once the namespace has answered. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Whether the profile accepts configuration writes. */
  writable: boolean
  /** Every provider, in display order. */
  providers: readonly MarkitdownProviderState[]
  /** Whether any provider is active (LLM mode on). */
  active: boolean
  /** Whether the active model also describes DOCX images (default off). */
  describeImages: boolean
  /** A write is crossing the wire. */
  busy: boolean
  /** The latest write outcome, cleared by the next write. */
  notice: MarkitdownSettingsNotice | undefined
}
