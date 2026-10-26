/**
 * Minimal type surface of `@deepseek-ai/dsh-credentials` this plugin builds
 * against. The published npm types trail the harness API, so the plugin
 * declares the contract it uses; the import in `index.ts` is type-only and
 * the host provides the real service at runtime.
 */
export interface ResolvedCredential {
  /** The secret value as configured. */
  readonly value: string
  /** Where the value came from (store, environment, …). */
  readonly source: string
}

/** The host-provided credential seam (`ctx.credentials`). */
export interface CredentialProvider {
  /**
   * Resolve one reference to its current value: the provider-managed store
   * first, then ambient fallbacks such as the process environment.
   * Per-call resolution; consumers must not cache across operations.
   */
  resolve(ref: string): Promise<ResolvedCredential | undefined>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Credential seam provided by the dsh host. */
    credentials: CredentialProvider
  }
}
