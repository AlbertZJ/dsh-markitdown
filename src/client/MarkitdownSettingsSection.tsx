/**
 * The MarkItDown settings page: one card per provider (OpenAI, DeepSeek,
 * custom endpoint), each with its own model, endpoint and API key. Exactly
 * one provider is active; its profile alone drives conversions. Keys are
 * write-only — they go to the credential store and never render back.
 */

import { useState, type CSSProperties } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-locale/client'
import {
  type MarkitdownProviderState, type MarkitdownSettingsNotice, type MarkitdownSettingsState,
  type ProviderId,
} from './contract.ts'
import type { MarkitdownSettingsFace } from './controller.ts'

/** Props the renderer binds for the section. */
export type MarkitdownSettingsSectionProps =
  { t: Translate; useMarkitdownSettings: <S>(selector: (state: MarkitdownSettingsState) => S) => S }
  & Omit<MarkitdownSettingsFace, 'hooks'>

/** Render the per-provider form, as the settings shell asks. */
export function MarkitdownSettingsSection(props: MarkitdownSettingsSectionProps) {
  const { t, saveProviderField, activateProvider, deactivateProvider, saveKey, clearKey } = props
  const state = props.useMarkitdownSettings(snapshot => snapshot)
  const [keyInputs, setKeyInputs] = useState<Partial<Record<ProviderId, string>>>({})
  if (state.status === 'unavailable') return <p style={css.note}>{t('unavailable')}</p>
  const disabled = !state.writable || state.busy
  const setKeyInput = (provider: ProviderId, value: string) => {
    setKeyInputs(draft => ({ ...draft, [provider]: value }))
  }
  return (
    <div style={css.column}>
      <p style={css.description}>{t('description')}</p>
      {!state.active ? <p style={css.note}>{t('llmOffNote')}</p> : null}
      {state.providers.map(provider => {
        const keyInput = keyInputs[provider.id] ?? ''
        const notice = noticeFor(state.notice, provider.id)
        return (
          <section
            key={provider.id}
            style={provider.active ? { ...css.card, ...css.cardActive } : css.card}
            aria-label={providerLabel(t, provider.id)}
          >
            <header style={css.cardHeader}>
              <span style={css.cardTitle}>{providerLabel(t, provider.id)}</span>
              {provider.active ? (
                <span style={css.activeRow}>
                  <span style={css.badge}>{t('activeBadge')}</span>
                  <button
                    type="button"
                    style={css.linkButton}
                    disabled={disabled}
                    onClick={() => { void deactivateProvider() }}
                  >
                    {t('deactivate')}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  style={css.option}
                  disabled={disabled}
                  onClick={() => { void activateProvider(provider.id) }}
                >
                  {t('activate')}
                </button>
              )}
            </header>
            {provider.id === 'custom' ? (
              <BlurField
                label={t('baseUrlLabel')}
                hint={t('baseUrlHint')}
                placeholder={t('baseUrlPlaceholder')}
                value={provider.baseUrl}
                disabled={disabled}
                onSave={value => saveProviderField(provider.id, 'baseUrl', value)}
              />
            ) : (
              <span style={css.hint}>{provider.baseUrl}</span>
            )}
            <BlurField
              label={t('modelLabel')}
              hint={t('modelHint')}
              placeholder={t('modelPlaceholder')}
              value={provider.model}
              disabled={disabled}
              onSave={value => saveProviderField(provider.id, 'model', value)}
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
                  onChange={event => setKeyInput(provider.id, event.currentTarget.value)}
                />
                <button
                  type="button"
                  style={css.primary}
                  disabled={disabled || keyInput.trim() === ''}
                  onClick={() => {
                    void saveKey(provider.id, keyInput).then(ok => {
                      if (ok) setKeyInput(provider.id, '')
                    })
                  }}
                >
                  {t('keySave')}
                </button>
                <button
                  type="button"
                  style={css.option}
                  disabled={disabled || provider.keyConfigured !== true}
                  onClick={() => { void clearKey(provider.id) }}
                >
                  {t('keyClear')}
                </button>
              </div>
              <span style={css.hint}>
                {t('keyRefHint', { ref: provider.apiKeyEnv })} · {keyStateText(t, provider)}
              </span>
            </div>
            {notice !== undefined ? <p style={css.note} role="status">{noticeText(t, notice)}</p> : null}
          </section>
        )
      })}
      {!state.writable && state.status === 'ready' ? <p style={css.note}>{t('readOnly')}</p> : null}
    </div>
  )
}

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

/** Localized provider name. */
function providerLabel(t: Translate, provider: ProviderId): string {
  if (provider === 'openai') return t('providerOpenai')
  if (provider === 'deepseek') return t('providerDeepseek')
  return t('providerCustom')
}

/** Credential state of one provider's key. */
function keyStateText(t: Translate, provider: MarkitdownProviderState): string {
  if (provider.keyConfigured === undefined) return t('keyChecking')
  return provider.keyConfigured ? t('keyConfigured') : t('keyNotConfigured')
}

/** The notice when it belongs to the given provider card. */
function noticeFor(notice: MarkitdownSettingsNotice | undefined, provider: ProviderId): MarkitdownSettingsNotice | undefined {
  return notice?.provider === provider ? notice : undefined
}

/** Localized text of one write outcome. */
function noticeText(t: Translate, notice: MarkitdownSettingsNotice): string {
  switch (notice.kind) {
    case 'saved': return t('saved')
    case 'failed': return t('failed')
    case 'activated': return t('activated')
    case 'activateFailed': return t('activateFailed')
    case 'deactivated': return t('deactivated')
    case 'keySaved': return t('keySaved')
    case 'keyCleared': return t('keyCleared')
    case 'keyFailed': return t('keyFailed')
  }
}

/** Inline styles: the standalone client bundle carries no CSS pipeline. */
const css: Record<string, CSSProperties> = {
  column: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 620 },
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
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid rgba(128,128,128,0.3)',
  },
  cardActive: { borderColor: 'Highlight', outline: '1px solid Highlight' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontWeight: 600 },
  activeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid Highlight',
    color: 'inherit',
  },
  option: {
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid rgba(128,128,128,0.4)',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  },
  linkButton: {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    opacity: 0.7,
    cursor: 'pointer',
    fontSize: 12,
    textDecoration: 'underline',
  },
  primary: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
  },
  keyRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
}
