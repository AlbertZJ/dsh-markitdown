/**
 * dsh-markitdown, browser half: the MarkItDown tab on the client's Plugins
 * settings page. Provider presets, the OpenAI-compatible endpoint, the model
 * name, and the API key (to the dsh credential store — never the profile).
 * The tab exists only while the host serves the plugin's entry namespace, so
 * deployments without the plugin show no trace.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only platform contracts (erased at build; the browser platform
// provides the services at runtime).
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { MarkitdownSettingsTab } from './MarkitdownSettingsTab.tsx'
import { ENTRY_ID } from './contract.ts'
import { MarkitdownSettingsController, type MarkitdownSettingsFace } from './controller.ts'
import { en, zh, type MarkitdownSettingsLocaleKey } from './locales.ts'

export type { MarkitdownSettingsTabProps } from './MarkitdownSettingsTab.tsx'
export type { MarkitdownSettingsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** MarkItDown settings tab copy. */
    'settings.markitdown': MarkitdownSettingsLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.markitdown'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.credentials', 'configForms']

/**
 * Contribute the MarkItDown tab while the host serves the plugin's entry.
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
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
      name: 'settings.plugins.tab',
      id: 'markitdown',
      order: 20,
      label: () => t('tab'),
      locale: NS,
      inject: () => controller.inject(),
    }, MarkitdownSettingsTab))),
    'dsh-markitdown: settings tab',
  )
}

// Type-only re-export so the face shape stays checked against the component.
export type { MarkitdownSettingsFace }
