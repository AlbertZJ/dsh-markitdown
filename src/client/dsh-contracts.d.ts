/**
 * Minimal client-side type contracts of the dsh browser platform this
 * plugin's settings tab builds against.
 *
 * The npm-published `@deepseek-ai/dsh-*` type packages trail the harness API,
 * so the plugin declares the exact surface it uses (all imports of these
 * modules are type-only and erased from the bundle; the browser platform
 * provides the real services at runtime through the module table).
 */

declare module '@deepseek-ai/dsh-client-ui-slots' {
  /** Declaration-merged map of locale namespaces (plugins augment this). */
  interface LocaleNamespaceMap {}
}

// The npm-published cordis types trail the harness runtime: dsh client
// plugins register teardown through `ctx.effect` (present on the host's
// cordis build), so declare the surface here.
declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Run one setup/teardown cycle for the plugin's lifetime: the callback
     * runs now and may return the disposer invoked at teardown. An optional
     * label names the effect in diagnostics.
     */
    effect(callback: () => void | (() => void), label?: string): () => void
  }
}

declare module '@deepseek-ai/dsh-client-locale/client' {
  import type { LocaleNamespaceMap } from '@deepseek-ai/dsh-client-ui-slots'

  /** Translate one dictionary key, interpolating `{name}` params. */
  export type Translate = (key: string, params?: Record<string, string | number>) => string

  /** Locale service face used by this tab. */
  export interface LocaleService {
    /** Register dictionaries for one namespace. */
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): void
    /** Bind a translator for one namespace. */
    bind<N extends keyof LocaleNamespaceMap & string>(namespace: N): Translate
  }

  declare module '@deepseek-ai/cordis' {
    interface Context {
      locale: LocaleService
    }
  }
}

declare module '@deepseek-ai/dsh-api-remotes/client' {
  /** One settings write operation (path-level set/unset over the namespace). */
  export interface SettingsPathOpView {
    op: 'set' | 'unset'
    path: readonly string[]
    value?: unknown
  }

  /** One credential reference's described state; the value never crosses. */
  export interface CredentialInfoView {
    configured: boolean
  }

  /** Remote result envelope: ok answers carry `value`, failures carry `error`. */
  export type RemoteResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: { code: string; message: string } }

  /** Credentials namespace face a configuration surface calls. */
  export interface CredentialsRemote {
    /** Describe references (configured state only, never values). */
    describe(refs: readonly string[]): Promise<RemoteResult<Record<string, CredentialInfoView | undefined>>>
    /** Durably store one secret under a reference. */
    set(ref: string, value: string): Promise<RemoteResult<undefined>>
    /** Remove one stored reference. */
    unset(ref: string): Promise<RemoteResult<undefined>>
  }

  /** The generated remote gateway face. */
  export interface RemoteGateway {
    credentials: CredentialsRemote
    /** Subscribe to one forwarded host event; returns the disposer. */
    $on(event: 'credentials/reference-updated', listener: () => void): () => void
  }

  declare module '@deepseek-ai/cordis' {
    interface Context {
      remote: RemoteGateway
    }
  }
}

declare module '@deepseek-ai/dsh-client-ui-settings/client' {
  import type { SettingsPathOpView, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'

  /** One namespace's sync snapshot over the host configuration mirror. */
  export interface ConfigFormSnapshot<T> {
    status: 'loading' | 'ready' | 'unavailable'
    value: T | undefined
    writable: boolean
  }

  /** One settings namespace's derived view plus its ordered writes. */
  export interface ConfigForm<T> {
    getSnapshot(): ConfigFormSnapshot<T>
    subscribe(listener: () => void): () => void
    /** Queue one scalar field write; resolves whether the host accepted it. */
    set(field: string, value: unknown): Promise<boolean>
    /** Queue one scalar field clear. */
    unset(field: string): Promise<boolean>
    /** Queue ordered path operations. */
    mutate(ops: readonly SettingsPathOpView[]): Promise<boolean>
  }

  /** The settings-form service face used by this tab. */
  export interface ConfigFormsService {
    /** Bind one namespace's form. */
    get<T>(namespace: string): ConfigForm<T>
    /**
     * Run `register` while every listed namespace is served by the host and
     * tear the registration down when any disappears.
     */
    whileServed(namespaces: readonly string[], register: () => () => void): () => void
  }

  declare module '@deepseek-ai/cordis' {
    interface Context {
      configForms: ConfigFormsService
    }
  }
}

declare module '@deepseek-ai/dsh-client-ui-renderer/client' {
  import type { LocaleNamespaceMap } from '@deepseek-ai/dsh-client-ui-slots'

  /** Options of one list-slot registration. */
  export interface SlotRegistrationOptions<Face extends object> {
    name: string
    id: string
    order: number
    label: () => string
    locale?: keyof LocaleNamespaceMap & string
    inject?: () => Face
  }

  /** A slot-bound snapshot store the renderer exposes as a `useSnapshot` hook. */
  export interface SlotStore<T> {
    getSnapshot(): T
    subscribe(listener: () => void): () => void
  }

  /** Slots registry face used by this tab. */
  export interface SlotsService {
    /** Declare occupancy of one slot; the factory re-runs on ledger changes. */
    inject(slot: string, factory: () => () => void): () => void
    /** Register one entry; returns the disposer removing it. */
    register<Face extends object>(options: SlotRegistrationOptions<Face>, component: unknown): () => void
  }

  declare module '@deepseek-ai/cordis' {
    interface Context {
      slots: SlotsService
    }
  }
}
