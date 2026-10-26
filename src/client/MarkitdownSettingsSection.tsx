/**
 * The MarkItDown settings section: provider presets, endpoint/model fields,
 * and the API key row. The key is write-only — it goes to the credential
 * store and its value never renders back into the form.
 */

import { useState, type CSSProperties } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-locale/client'
import { LLM_PROVIDER_PRESETS, type LlmProviderSelection, type MarkitdownSettingsState } from './contract.ts'
import type { MarkitdownSettingsFace } from './controller.ts'

/** Props the renderer binds for the section. */
export type MarkitdownSettingsSectionProps =
  { t: Translate; useMarkitdownSettings: <S>(selector: (state: MarkitdownSettingsState) => S) => S }
  & Omit<MarkitdownSettingsFace, 'hooks'>

/** Render the provider/key form, as the settings shell asks. */
export function MarkitdownSettingsSection(props: MarkitdownSettingsSectionProps) {
  const { t, saveField, saveKey, clearKey } = props
  const state = props.useMarkitdownSettings(snapshot => snapshot)
  const [keyInput, setKeyInput] = useState('')
  if (state.status === 'unavailable') return <p style={css.note}>{t('unavailable')}</p>
  const disabled = !state.writable || state.busy
  const selection = providerSelectionOf(state.llmBaseUrl)
  const applyPreset = (id: string) => {
    const preset = LLM_PROVIDER_PRESETS.find(candidate => candidate.id === id)
    if (preset === undefined || preset.id === 'custom') return
    void saveField('llmBaseUrl', preset.baseUrl)
    void saveField('llmModel', preset.model)
  }
  return (
    <div style={css.column}>
      <p style={css.description}>{t('description')}</p>
      {!state.llmEnabled ? <p style={css.note}>{t('llmOffNote')}</p> : null}
      <div style={css.field}>
        <span style={css.label}>{t('providerLabel')}</span>
        <div style={css.options} role="radiogroup" aria-label={t('providerLabel')}>
          {LLM_PROVIDER_PRESETS.map(preset => {
            const active = preset.id !== 'custom' && selection.kind === 'preset' && selection.id === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled || preset.id === 'custom'}
                style={active ? { ...css.option, ...css.optionActive } : css.option}
                onClick={() => { applyPreset(preset.id) }}
              >
                {t(preset.id === 'openai' ? 'providerOpenai' : preset.id === 'deepseek' ? 'providerDeepseek' : 'providerCustom')}
              </button>
            )
          })}
        </div>
      </div>
      <BlurField
        label={t('baseUrlLabel')}
        hint={t('baseUrlHint')}
        placeholder={t('baseUrlPlaceholder')}
        value={state.llmBaseUrl}
        disabled={disabled}
        onSave={value => saveField('llmBaseUrl', value)}
      />
      <BlurField
        label={t('modelLabel')}
        hint={t('modelHint')}
        placeholder={t('modelPlaceholder')}
        value={state.llmModel}
        disabled={disabled}
        onSave={value => saveField('llmModel', value)}
      />
      <BlurField
        label={t('keyRefLabel')}
        hint={t('keyRefHint')}
        placeholder={DEFAULT_KEY_REF_PLACEHOLDER}
        value={state.llmApiKeyEnv}
        disabled={disabled}
        onSave={value => saveField('llmApiKeyEnv', value)}
      />
      <div style={css.field}>
        <span style={css.label}>{t('keyLabel')}</span>
        <div style={css.keyRow}>
          <input
            type="password"
            style={css.input}
            placeholder={t('keyPlaceholder')}
            value={keyInput}
            disabled={disabled}
            onChange={event => setKeyInput(event.target.value)}
          />
          <button
            type="button"
            style={css.primary}
            disabled={disabled || keyInput.trim() === ''}
            onClick={() => {
              void saveKey(keyInput).then(ok => { if (ok) setKeyInput('') })
            }}
          >
            {t('keySave')}
          </button>
          <button
            type="button"
            style={css.option}
            disabled={disabled || state.keyConfigured !== true}
            onClick={() => { void clearKey() }}
          >
            {t('keyClear')}
          </button>
        </div>
        <span style={css.hint}>
          {state.keyConfigured === undefined ? t('keyChecking') : state.keyConfigured ? t('keyConfigured') : t('keyNotConfigured')}
        </span>
      </div>
      {state.notice !== undefined ? <p style={css.note} role="status">{noticeText(t, state)}</p> : null}
      {!state.writable && state.status === 'ready' ? <p style={css.note}>{t('readOnly')}</p> : null}
    </div>
  )
}

const DEFAULT_KEY_REF_PLACEHOLDER = 'OPENAI_API_KEY'

/** One text field that saves its (trimmed) contents on blur or Enter. */
function BlurField(props: {
  label: string
  hint: string
  placeholder: string
  value: string
  disabled: boolean
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const shown = draft ?? props.value
  const commit = () => {
    if (draft !== undefined && draft.trim() !== props.value) props.onSave(draft)
    setDraft(undefined)
  }
  return (
    <div style={css.field}>
      <span style={css.label}>{props.label}</span>
      <input
        type="text"
        style={css.input}
        placeholder={props.placeholder}
        value={shown}
        disabled={props.disabled}
        onChange={event => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={event => { if (event.key === 'Enter') commit() }}
      />
      <span style={css.hint}>{props.hint}</span>
    </div>
  )
}

/** Map the configured endpoint onto a preset (or custom). */
function providerSelectionOf(baseUrl: string): LlmProviderSelection {
  const normalized = baseUrl.trim().replace(/\/+$/u, '')
  const preset = LLM_PROVIDER_PRESETS.find(candidate => candidate.id !== 'custom' && candidate.baseUrl === normalized)
  return preset === undefined ? { kind: 'custom', baseUrl: normalized } : { kind: 'preset', id: preset.id }
}

/** Localized text of the latest write outcome. */
function noticeText(t: Translate, state: MarkitdownSettingsState): string {
  const notice = state.notice
  if (notice === undefined) return ''
  switch (notice.kind) {
    case 'saved': return t('saved')
    case 'failed': return t('failed')
    case 'keySaved': return t('keySaved')
    case 'keyCleared': return t('keyCleared')
    case 'keyFailed': return t('keyFailed')
  }
}

/** Inline styles: the standalone client bundle carries no CSS pipeline. */
const css: Record<string, CSSProperties> = {
  column: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 },
  description: { margin: 0, opacity: 0.75, lineHeight: 1.6 },
  note: { margin: 0, opacity: 0.65 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontWeight: 600 },
  hint: { fontSize: 12, opacity: 0.6 },
  input: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(128,128,128,0.4)',
    background: 'transparent',
    color: 'inherit',
    fontSize: 13,
  },
  options: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  option: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(128,128,128,0.4)',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  },
  optionActive: { borderColor: 'Highlight', outline: '1px solid Highlight' },
  primary: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
  },
  keyRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
}
