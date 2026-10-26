/**
 * Shared contract of the MarkItDown settings tab: the host entry namespace it
 * configures, the provider presets the tab offers, and the state surface the
 * tab renders.
 */

/** Host cordis entry id the plugin's bundle patch installs. */
export const ENTRY_ID = 'markitdown'

/** Default credential reference the host resolves the API key from. */
export const DEFAULT_KEY_REF = 'OPENAI_API_KEY'

/** One selectable LLM provider preset (OpenAI-compatible endpoints). */
export interface LlmProviderPreset {
  /** Stable selection key. */
  readonly id: 'openai' | 'deepseek' | 'custom'
  /** Provider base URL written into `llmBaseUrl`. */
  readonly baseUrl: string
  /** Default model written into `llmModel` when the preset is applied. */
  readonly model: string
}

/** Provider presets the tab offers; `custom` only reselects manual entry. */
export const LLM_PROVIDER_PRESETS: readonly LlmProviderPreset[] = [
  { id: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'custom', baseUrl: '', model: '' },
]

/** How the current endpoint maps onto the presets. */
export type LlmProviderSelection =
  | { kind: 'preset'; id: LlmProviderPreset['id'] }
  | { kind: 'custom'; baseUrl: string }

/** Transient outcome the surface reports after a write attempt. */
export type MarkitdownSettingsNotice =
  | { kind: 'saved'; field: 'llmModel' | 'llmBaseUrl' | 'llmApiKeyEnv' }
  | { kind: 'failed'; field: 'llmModel' | 'llmBaseUrl' | 'llmApiKeyEnv' }
  | { kind: 'keySaved' }
  | { kind: 'keyCleared' }
  | { kind: 'keyFailed' }

/** What the settings tab renders. */
export interface MarkitdownSettingsState {
  /** ready once the namespace has answered. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Whether the profile accepts configuration writes. */
  writable: boolean
  /** Whether LLM mode is on (a model is configured). */
  llmEnabled: boolean
  /** Current values mirrored from the namespace (empty string when unset). */
  llmModel: string
  llmBaseUrl: string
  /** Credential reference the API key is stored/read under. */
  llmApiKeyEnv: string
  /** Whether the key reference holds a secret; undefined while checking. */
  keyConfigured: boolean | undefined
  /** A write is crossing the wire. */
  busy: boolean
  /** The latest write outcome, cleared by the next write. */
  notice: MarkitdownSettingsNotice | undefined
}
