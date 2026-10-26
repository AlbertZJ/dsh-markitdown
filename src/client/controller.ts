/**
 * The MarkItDown settings page's controller: follows the plugin's host entry
 * namespace (per-provider profiles plus the active provider), answers whether
 * each provider's credential reference holds a key, and performs the writes —
 * configuration fields through the settings form, API keys through the
 * credential store (values never enter the profile configuration).
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only platform contracts (erased at build; runtime comes from the
// platform module table).
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  ENTRY_ID, LLM_PROVIDER_PRESETS,
  type MarkitdownProviderState, type MarkitdownSettingsNotice, type MarkitdownSettingsState,
  type ProviderField, type ProviderId,
} from './contract.ts'
import { createSnapshotStore, type SnapshotStore } from './store.ts'

/** One entry's effective config slice the page reads and writes. */
interface MarkitdownEntryConfig {
  llmProvider?: unknown
  llmProviders?: unknown
  llmModel?: unknown
  llmBaseUrl?: unknown
  llmApiKeyEnv?: unknown
  describeImages?: unknown
}

/** One provider profile as stored under `llmProviders`. */
interface StoredProfile {
  baseUrl: string
  model: string
  apiKeyEnv: string
}

/** The registration-side face the page's slot entry injects. */
export interface MarkitdownSettingsFace {
  hooks: {
    /** Page snapshot bound by the renderer as useMarkitdownSettings. */
    markitdownSettings: SnapshotStore<MarkitdownSettingsState>
  }
  /** Save one profile field of a provider ('' clears it). */
  saveProviderField: (provider: ProviderId, field: ProviderField, value: string) => Promise<void>
  /** Make one provider the active one (its profile alone drives conversions). */
  activateProvider: (provider: ProviderId) => Promise<void>
  /** Turn LLM mode off entirely. */
  deactivateProvider: () => Promise<void>
  /** Enable or disable model-written descriptions of DOCX images. */
  setDescribeImages: (enabled: boolean) => Promise<void>
  /** Store a provider's API key under its reference. */
  saveKey: (provider: ProviderId, value: string) => Promise<boolean>
  /** Remove a provider's stored API key. */
  clearKey: (provider: ProviderId) => Promise<void>
}

/** Follows the entry namespace and performs the page's writes. */
export class MarkitdownSettingsController {
  private readonly store = createSnapshotStore<MarkitdownSettingsState>({
    status: 'loading',
    writable: false,
    providers: LLM_PROVIDER_PRESETS.map(preset => ({
      id: preset.id,
      active: false,
      model: '',
      baseUrl: preset.baseUrl,
      apiKeyEnv: preset.apiKeyEnv,
      keyConfigured: undefined,
    })),
    active: false,
    describeImages: false,
    busy: false,
    notice: undefined,
  })
  private readonly form: ConfigForm<MarkitdownEntryConfig>
  private readonly unsubscribe: () => void
  /** Key answers keyed by credential reference; undefined while checking. */
  private readonly keys = new Map<string, boolean | undefined>()
  /** Reference set the pending credentials read describes; a stale answer is dropped. */
  private keyGeneration = 0

  /**
   * @param ctx - the browser plugin context, whose `configForms` service binds
   * the entry namespace and whose `remote.credentials` answers for the keys.
   */
  constructor(private readonly ctx: ClientContext) {
    this.form = ctx.configForms.get<MarkitdownEntryConfig>(ENTRY_ID)
    this.unsubscribe = this.form.subscribe(() => { this.derive() })
    this.derive()
  }

  /** Build the face the page's slot registration injects. */
  inject(): MarkitdownSettingsFace {
    return {
      hooks: { markitdownSettings: this.store },
      saveProviderField: (provider, field, value) => this.saveProviderField(provider, field, value),
      activateProvider: provider => this.activateProvider(provider),
      deactivateProvider: () => this.deactivateProvider(),
      setDescribeImages: enabled => this.setDescribeImages(enabled),
      saveKey: (provider, value) => this.saveKey(provider, value),
      clearKey: provider => this.clearKey(provider),
    }
  }

  /** Re-read every provider's key after the host reports a change. */
  refreshKey(): void { void this.readKeys() }

  /** Release namespace subscriptions. */
  dispose(): void { this.unsubscribe() }

  /** Save one profile field; an empty string clears it. */
  private async saveProviderField(provider: ProviderId, field: ProviderField, value: string): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (!snapshot.writable || snapshot.busy) return
    const current = snapshot.providers.find(candidate => candidate.id === provider)
    if (current === undefined) return
    const next: StoredProfile = { baseUrl: current.baseUrl, model: current.model, apiKeyEnv: current.apiKeyEnv }
    next[field] = value.trim()
    const accepted = await this.write(provider, next, current.active)
    this.store.update(draft => {
      draft.notice = { kind: accepted ? 'saved' : 'failed', provider, field }
    })
  }

  /** Make one provider active: every field of its profile is written, then `llmProvider`. */
  private async activateProvider(provider: ProviderId): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (!snapshot.writable || snapshot.busy) return
    const current = snapshot.providers.find(candidate => candidate.id === provider)
    if (current === undefined || current.active) return
    const profile: StoredProfile = { baseUrl: current.baseUrl, model: current.model, apiKeyEnv: current.apiKeyEnv }
    const accepted = await this.write(provider, profile, true)
    this.store.update(draft => {
      draft.notice = { kind: accepted ? 'activated' : 'activateFailed', provider }
    })
  }

  /** Turn LLM mode off: drop the active profile marker and the legacy model name. */
  private async deactivateProvider(): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (!snapshot.writable || snapshot.busy) return
    const active = snapshot.providers.find(candidate => candidate.active)
    if (active === undefined) return
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const accepted = await this.form.mutate([
        { op: 'unset', path: ['llmProvider'] },
        // The legacy field would otherwise re-enable LLM mode on its own.
        { op: 'unset', path: ['llmModel'] },
      ])
      this.store.update(draft => {
        draft.busy = false
        draft.notice = { kind: accepted ? 'deactivated' : 'activateFailed', provider: active.id }
      })
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /**
   * Enable or disable descriptions. Off is the schema default, so disabling
   * removes the field instead of persisting `false`.
   */
  private async setDescribeImages(enabled: boolean): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (!snapshot.writable || snapshot.busy) return
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const accepted = await this.form.mutate([
        enabled
          ? { op: 'set', path: ['describeImages'], value: true }
          : { op: 'unset', path: ['describeImages'] },
      ])
      this.store.update(draft => {
        draft.busy = false
        draft.notice = { kind: accepted ? 'describeSaved' : 'describeFailed' }
      })
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Write a complete profile, optionally making it active, in one mutation. */
  private async write(provider: ProviderId, profile: StoredProfile, activate: boolean): Promise<boolean> {
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    const ops: SettingsPathOpView[] = []
    for (const [field, value] of Object.entries(profile)) {
      ops.push(value === ''
        ? { op: 'unset', path: ['llmProviders', provider, field] }
        : { op: 'set', path: ['llmProviders', provider, field], value })
    }
    if (activate) ops.push({ op: 'set', path: ['llmProvider'], value: provider })
    try {
      const accepted = await this.form.mutate(ops)
      this.store.update(draft => { draft.busy = false })
      return accepted
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Store a provider's API key in the credential store; resolves whether it accepted. */
  private async saveKey(provider: ProviderId, value: string): Promise<boolean> {
    const trimmed = value.trim()
    const current = this.store.getSnapshot().providers.find(candidate => candidate.id === provider)
    if (trimmed === '' || current === undefined) {
      this.store.update(draft => { draft.notice = { kind: 'keyFailed', provider } })
      return false
    }
    if (this.store.getSnapshot().busy) return false
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const response = await this.ctx.remote.credentials.set(current.apiKeyEnv, trimmed)
      this.keys.set(current.apiKeyEnv, response.ok)
      this.store.update(draft => {
        draft.busy = false
        draft.providers = draft.providers.map(candidate => candidate.id === provider
          ? { ...candidate, keyConfigured: response.ok }
          : candidate)
        draft.notice = { kind: response.ok ? 'keySaved' : 'keyFailed', provider }
      })
      return response.ok
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Remove a provider's stored API key; an absent key is a no-op on the host. */
  private async clearKey(provider: ProviderId): Promise<void> {
    const current = this.store.getSnapshot().providers.find(candidate => candidate.id === provider)
    if (current === undefined || this.store.getSnapshot().busy) return
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const response = await this.ctx.remote.credentials.unset(current.apiKeyEnv)
      if (response.ok) this.keys.set(current.apiKeyEnv, false)
      this.store.update(draft => {
        draft.busy = false
        draft.providers = draft.providers.map(candidate => candidate.id === provider
          ? { ...candidate, keyConfigured: response.ok ? false : candidate.keyConfigured }
          : candidate)
        draft.notice = { kind: response.ok ? 'keyCleared' : 'keyFailed', provider }
      })
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Ask the credentials domain which provider references currently hold a key. */
  private async readKeys(): Promise<void> {
    const refs = [...new Set(this.store.getSnapshot().providers.map(provider => provider.apiKeyEnv))]
    const generation = ++this.keyGeneration
    const response = await this.ctx.remote.credentials.describe(refs)
    if (!response.ok || generation !== this.keyGeneration) return
    for (const ref of refs) this.keys.set(ref, response.value[ref]?.configured ?? false)
    this.publishKeys()
  }

  /** Fold the form snapshot into the page state. */
  private derive(): void {
    const snapshot = this.form.getSnapshot()
    const value = snapshot.value
    const explicitId = text(value?.llmProvider)
    const legacyModel = text(value?.llmModel)
    const legacyBaseUrl = text(value?.llmBaseUrl)
    const legacyKeyEnv = text(value?.llmApiKeyEnv)
    // Before the first activation the page shows the legacy single-provider
    // configuration under the provider its endpoint names.
    const legacyId = explicitId === '' && legacyModel !== '' ? legacyProviderOf(legacyBaseUrl) : undefined
    const activeId = explicitId !== '' ? explicitId : legacyId
    const rawProviders = isRecord(value?.llmProviders) ? value.llmProviders : {}
    const providers = LLM_PROVIDER_PRESETS.map(preset => {
      const entry: unknown = rawProviders[preset.id]
      const stored: Record<string, unknown> = isRecord(entry) ? entry : {}
      const legacy = explicitId === '' && activeId === preset.id
      const apiKeyEnv = text(stored.apiKeyEnv) || (legacy && legacyKeyEnv !== '' ? legacyKeyEnv : preset.apiKeyEnv)
      return {
        id: preset.id,
        active: activeId === preset.id,
        model: text(stored.model) || (legacy ? legacyModel : ''),
        baseUrl: text(stored.baseUrl) || (legacy && legacyBaseUrl !== '' ? legacyBaseUrl : preset.baseUrl),
        apiKeyEnv,
        keyConfigured: this.keys.get(apiKeyEnv),
      } satisfies MarkitdownProviderState
    })
    this.store.update(draft => {
      draft.status = snapshot.status
      draft.writable = snapshot.writable
      draft.providers = providers
      draft.active = activeId !== undefined
      draft.describeImages = value?.describeImages === true
    })
    void this.readKeys()
  }

  /** Fold the key answers into the current provider list. */
  private publishKeys(): void {
    this.store.update(draft => {
      draft.providers = draft.providers.map(provider => ({
        ...provider,
        keyConfigured: this.keys.get(provider.apiKeyEnv),
      }))
    })
  }
}

/** Normalize a persisted string value. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Narrow a persisted JSON value to a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Map a legacy endpoint onto the preset it names; an empty endpoint means OpenAI's default. */
function legacyProviderOf(baseUrl: string): ProviderId {
  const normalized = baseUrl.trim().replace(/\/+$/u, '')
  if (normalized === '') return 'openai'
  const preset = LLM_PROVIDER_PRESETS.find(candidate => candidate.id !== 'custom' && candidate.baseUrl === normalized)
  return preset === undefined ? 'custom' : preset.id
}
