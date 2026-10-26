/**
 * The MarkItDown settings tab's controller: follows the plugin's host entry
 * namespace (model / endpoint / key reference), answers whether the
 * credential reference holds a key, and performs the writes — configuration
 * fields through the settings form, the API key through the credential store
 * (the value never enters the profile configuration).
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only platform contracts (erased at build; runtime comes from the
// platform module table).
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ENTRY_ID, DEFAULT_KEY_REF, type MarkitdownSettingsNotice, type MarkitdownSettingsState } from './contract.ts'
import { createSnapshotStore, type SnapshotStore } from './store.ts'

/** One entry's effective config slice the tab reads and writes. */
interface MarkitdownEntryConfig {
  llmModel?: unknown
  llmBaseUrl?: unknown
  llmApiKeyEnv?: unknown
}

/** The registration-side face the tab's slot entry injects. */
export interface MarkitdownSettingsFace {
  hooks: {
    /** Tab snapshot bound by the renderer as useMarkitdownSettings. */
    markitdownSettings: SnapshotStore<MarkitdownSettingsState>
  }
  /** Save one configuration field ('' clears it). */
  saveField: (field: 'llmModel' | 'llmBaseUrl' | 'llmApiKeyEnv', value: string) => Promise<void>
  /** Store the API key under the configured reference. */
  saveKey: (value: string) => Promise<boolean>
  /** Remove the stored API key. */
  clearKey: () => Promise<void>
}

/** Follows the entry namespace and performs the tab's writes. */
export class MarkitdownSettingsController {
  private readonly store = createSnapshotStore<MarkitdownSettingsState>({
    status: 'loading',
    writable: false,
    llmEnabled: false,
    llmModel: '',
    llmBaseUrl: '',
    llmApiKeyEnv: DEFAULT_KEY_REF,
    keyConfigured: undefined,
    busy: false,
    notice: undefined,
  })
  private readonly form: ConfigForm<MarkitdownEntryConfig>
  /** Reference the last credentials answer describes; a stale one is dropped. */
  private keyRef = DEFAULT_KEY_REF
  private keyConfigured: boolean | undefined
  private readonly unsubscribe: () => void

  /**
   * @param ctx - the browser plugin context, whose `configForms` service binds
   * the entry namespace and whose `remote.credentials` answers for the key.
   */
  constructor(private readonly ctx: ClientContext) {
    this.form = ctx.configForms.get<MarkitdownEntryConfig>(ENTRY_ID)
    this.unsubscribe = this.form.subscribe(() => { this.derive() })
    this.derive()
    void this.readKey()
  }

  /** Build the face the tab's slot registration injects. */
  inject(): MarkitdownSettingsFace {
    return {
      hooks: { markitdownSettings: this.store },
      saveField: (field, value) => this.saveField(field, value),
      saveKey: (value) => this.saveKey(value),
      clearKey: () => this.clearKey(),
    }
  }

  /** Re-read the key after the host reports a change to the watched reference. */
  refreshKey(): void { void this.readKey() }

  /** Release namespace subscriptions. */
  dispose(): void { this.unsubscribe() }

  /** Save one scalar field; an empty string clears it (LLM mode off for the model). */
  private async saveField(field: 'llmModel' | 'llmBaseUrl' | 'llmApiKeyEnv', value: string): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (!snapshot.writable || snapshot.busy) return
    const trimmed = value.trim()
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const accepted = trimmed === ''
        ? await this.form.unset(field)
        : await this.form.set(field, trimmed)
      this.store.update(draft => {
        draft.busy = false
        draft.notice = { kind: accepted ? 'saved' : 'failed', field } satisfies MarkitdownSettingsNotice
      })
      // A key-reference rename orphans the stored key under the old name.
      if (accepted && field === 'llmApiKeyEnv') void this.readKey()
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Store the API key in the credential store; resolves whether it accepted. */
  private async saveKey(value: string): Promise<boolean> {
    const trimmed = value.trim()
    if (trimmed === '') {
      this.store.update(draft => { draft.notice = { kind: 'keyFailed' } })
      return false
    }
    const snapshot = this.store.getSnapshot()
    if (snapshot.busy) return false
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const response = await this.ctx.remote.credentials.set(this.keyRef, trimmed)
      this.keyConfigured = response.ok
      this.store.update(draft => {
        draft.busy = false
        draft.keyConfigured = response.ok
        draft.notice = { kind: response.ok ? 'keySaved' : 'keyFailed' } satisfies MarkitdownSettingsNotice
      })
      return response.ok
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Remove the stored API key; an absent key is a no-op on the host. */
  private async clearKey(): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (snapshot.busy) return
    this.store.update(draft => { draft.busy = true; draft.notice = undefined })
    try {
      const response = await this.ctx.remote.credentials.unset(this.keyRef)
      if (response.ok) this.keyConfigured = false
      this.store.update(draft => {
        draft.busy = false
        draft.keyConfigured = response.ok ? false : this.keyConfigured
        draft.notice = { kind: response.ok ? 'keyCleared' : 'keyFailed' } satisfies MarkitdownSettingsNotice
      })
    } finally {
      if (this.store.getSnapshot().busy) this.store.update(draft => { draft.busy = false })
    }
  }

  /** Ask the credentials domain whether the watched reference holds a key. */
  private async readKey(): Promise<void> {
    const configured = this.form.getSnapshot().value?.llmApiKeyEnv
    const ref = typeof configured === 'string' && configured.trim() !== '' ? configured.trim() : DEFAULT_KEY_REF
    if (ref !== this.keyRef) {
      this.keyRef = ref
      this.keyConfigured = undefined
      this.publish()
    }
    const response = await this.ctx.remote.credentials.describe([this.keyRef])
    if (!response.ok || this.keyRef !== ref) return
    const configuredNow = response.value[this.keyRef]?.configured ?? false
    if (configuredNow === this.keyConfigured) return
    this.keyConfigured = configuredNow
    this.publish()
  }

  /** Fold the form snapshot into the tab state. */
  private derive(): void {
    const snapshot = this.form.getSnapshot()
    const value = snapshot.value
    const llmModel = typeof value?.llmModel === 'string' ? value.llmModel : ''
    const llmBaseUrl = typeof value?.llmBaseUrl === 'string' ? value.llmBaseUrl : ''
    const llmApiKeyEnv = typeof value?.llmApiKeyEnv === 'string' && value.llmApiKeyEnv !== ''
      ? value.llmApiKeyEnv
      : DEFAULT_KEY_REF
    this.store.update(draft => {
      draft.status = snapshot.status
      draft.writable = snapshot.writable
      draft.llmEnabled = llmModel.trim() !== ''
      draft.llmModel = llmModel
      draft.llmBaseUrl = llmBaseUrl
      draft.llmApiKeyEnv = llmApiKeyEnv
    })
    void this.readKey()
  }

  /** Fold the key answer into the snapshot without touching the rest. */
  private publish(): void {
    const keyConfigured = this.keyConfigured
    this.store.update(draft => { draft.keyConfigured = keyConfigured })
  }
}
