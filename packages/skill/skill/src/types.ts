/**
 * Client-safe cordis event vocabulary for the skill registry. Remotes
 * forward `skills/change` from this declaration; the Host registry file
 * imports it so both faces share one signature.
 *
 * @module @deepseek-ai/dsh-skill/types
 */

export {}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * A skill provider, runtime contribution, or provider-backed catalog may
     * have changed. This is an unfiltered invalidation notification; consumers
     * refetch the catalog for their own lookup options. Listener failures are
     * contained and cannot veto the registry mutation.
     * @mode emit
     */
    'skills/change'(): void
  }
}
