/**
 * dsh-markitdown, browser half: a MarkItDown page of its own on the client's
 * Settings window (next to 运营助手, not inside the plugin inventory). One
 * card per provider (OpenAI, DeepSeek, custom endpoint), each with its own
 * model and API key (to the dsh credential store — never the profile); the
 * active card alone drives conversions. The page exists only while the host
 * serves the plugin's entry namespace, so deployments without the plugin
 * show no trace.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only platform contracts (erased at build; the browser platform
// provides the services at runtime).
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { MarkitdownSettingsSection } from './MarkitdownSettingsSection.tsx'
import { ENTRY_ID } from './contract.ts'
import { MarkitdownSettingsController, type MarkitdownSettingsFace } from './controller.ts'
import { en, zh, type MarkitdownSettingsLocaleKey } from './locales.ts'

export type { MarkitdownSettingsSectionProps } from './MarkitdownSettingsSection.tsx'
export type { MarkitdownSettingsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** MarkItDown settings section copy. */
    'settings.markitdown': MarkitdownSettingsLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.markitdown'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.credentials', 'configForms']

/**
 * Contribute the MarkItDown settings page while the host serves the plugin's
 * entry.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-markitdown: dictionaries')
  const controller = new MarkitdownSettingsController(ctx)
  ctx.effect(() => () => { controller.dispose() }, 'dsh-markitdown: namespace subscriptions')
  ctx.effect(
    () => ctx.remote.$on('credentials/reference-updated', () => { controller.refreshKey() }),
    'dsh-markitdown: key invalidations',
  )
  // Ordered after the official sections and after the ops assistant (110):
  // document conversion is a niche concern, visited less often.
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'markitdown',
      order: 120,
      label: () => t('nav'),
      locale: NS,
      inject: () => controller.inject(),
    }, MarkitdownSettingsSection))),
    'dsh-markitdown: settings section',
  )
}

// Type-only re-export so the face shape stays checked against the component.
export type { MarkitdownSettingsFace }
