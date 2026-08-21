/**
 * Skill reference plugin, browser half: registers the '/' skill source —
 * candidates from the skill.list RPC addressed by the per-call session
 * projection's sessionId (sessions are always agent-backed; the host
 * resolves cwd from the session header). A pick lands the literal `/name `
 * text and the prompt ships the same literal (plain-text-reference decision;
 * see .agents/notes/implemented/architecture/2026-07-25-web-input-machine-and-slash-pipeline.md);
 * determinism
 * lives host-side — the pre-step boundary (`dsh-tool-skill`) recognizes a
 * leading `/name` naming a user-invocable skill and injects the rendered
 * body for every entry point, including `disable-model-invocation` skills the
 * model-side catalog never lists (issue #1470). The RPC rides the plugin's
 * root-context connection captured at registration — the source never reads
 * services off a per-call argument. Draft chip visuals derive from
 * the lexicon scan; this source implements no reference codec.
 *
 * Catalog fetches are cached per session (the small twin of the ui-commands
 * directory): the per-keystroke candidates re-poll filters a settled
 * snapshot locally, so one session costs one RPC. The scope-birth warm hook
 * prewarms the session's key; a preset switch drops that one key (the
 * catalog is the preset's, and a blank session may switch after the warm);
 * connection/reset clears everything — the host
 * catalog may differ across generations. A shared in-flight fetch
 * deliberately outlives any single menu interaction: closing the menu must
 * not kill the prewarm other consumers will hit, so it carries its own
 * abort (fired only on invalidation/teardown) while a candidates caller
 * with an aborted signal just returns early.
 *
 * This browser half also owns the `skill` keyed toolview: a replay-stable
 * accent row derived only from each logged call/result slice.
 */
// Type-only: the carrier types, the forwarded Host-event face and the ctx.remote merge.
import type { ConnectionHandle, SkillEntry } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext, ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { InputTriggerServiceContract, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { SkillPage } from './SkillPage.tsx'
import type { SkillPageInjected } from './SkillPage.tsx'
import { loadDisabledSkills } from './skill-enabled.ts'
import { SkillPlusItem } from './SkillPlusItem.tsx'
import type { SkillPlusInjected } from './SkillPlusItem.tsx'
import { SkillRow } from './SkillRow.tsx'
import { en, NS, zh, type SkillKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The dedicated skill tool row's copy. */
    skill: SkillKey
  }
}

/** One session's catalog fetch: the shared promise plus its own abort handle. */
interface CatalogFetch {
  readonly promise: Promise<readonly SkillEntry[]>
  readonly abort: AbortController
  /** Settled catalog for synchronous lexicon reads (unset while in flight or on failure). */
  settled?: readonly SkillEntry[]
}

/** Required services: reference source faces plus the tool-row and locale registries. */
export const inject = ['inputTriggers', 'connection', 'sessions', 'slots', 'locale', 'remote', 'layout']

/**
 * Client plugin body: register the '/' source, dictionaries, and keyed tool row.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-skill: dictionaries')
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'skill', locale: NS },
    SkillRow,
  ))

  const skills = (ctx.get('connection') as ConnectionHandle).api.skills
  const sessions = ctx.get('sessions') as ISessions
  // Session-keyed catalog cache; single-flight per key. Plugin-closure state:
  // the fiber effect below is its teardown boundary.
  const fetches = new Map<string, CatalogFetch>()
  const pageListeners = new Set<() => void>()
  const notifyPages = (): void => {
    for (const listener of [...pageListeners]) listener()
  }
  // Per-session lexicon invalidation listeners (subscribeLexicon consumers).
  const lexiconListeners = new Map<SessionId, Set<() => void>>()

  const notifyLexicon = (sessionId: SessionId): void => {
    for (const listener of [...(lexiconListeners.get(sessionId) ?? [])]) {
      try {
        listener()
      } catch (error) {
        // Contain listener failures: settlement notifies from an ignored
        // promise chain (a throw would surface as an unhandled rejection)
        // and one faulty consumer must not starve the others.
        console.error('[ui-skill] lexicon listener failed:', error)
      }
    }
  }

  const fetchCatalog = (sessionId: SessionId | undefined): Promise<readonly SkillEntry[]> => {
    if (sessionId !== undefined && sessions.subagentAddress(sessionId) !== undefined) {
      return Promise.resolve([])
    }
    const key = sessionId ?? 'host'
    const existing = fetches.get(key)
    if (existing !== undefined) return existing.promise
    const abort = new AbortController()
    const promise = (async () => {
      const { result } = await skills.list(
        sessionId === undefined ? {} : { sessionId },
        abort.signal,
      )
      if (!result.ok) throw new Error(`skill.list failed: ${result.error.code}: ${result.error.message}`)
      return result.value.skills
    })()
    const entry: CatalogFetch = { promise, abort }
    fetches.set(key, entry)
    promise.then(
      // Settled snapshot backs the synchronous lexicon reads.
      (skills) => {
        entry.settled = skills
        if (sessionId !== undefined) notifyLexicon(sessionId)
        notifyPages()
      },
      // A failed fetch must not poison the key: the next consumer retries.
      () => {
        if (fetches.get(key) === entry) fetches.delete(key)
      },
    )
    return promise
  }

  const invalidate = (key: string): void => {
    const entry = fetches.get(key)
    if (entry === undefined) return
    fetches.delete(key)
    entry.abort.abort()
    notifyLexicon(key as SessionId)
    notifyPages()
  }

  const clearAll = (): void => {
    for (const key of [...fetches.keys()]) invalidate(key)
  }

  // The bound translate resolves against the registered dictionaries with the
  // locale service's own fallback ladder; candidate-time reads stay plain text.
  const t = ctx.locale.bind(NS)

  const source: InputTriggerSource = {
    trigger: '/',
    name: 'skill',
    order: 2,
    async candidates(session, { query, signal }) {
      const skills = await fetchCatalog(session.sessionId)
      // Superseded keystroke: the shared fetch stays warm, this caller yields.
      if (signal.aborted) return []
      const disabled = loadDisabledSkills()
      return skills
        .filter(skill => !disabled.has(skill.name) && skill.name.startsWith(query))
        .map(skill => ({
          name: skill.name,
          // The user-only marker rides the description (the menu's only
          // secondary text); `hint` is the claim-state ghost text, not a badge.
          description: skill.modelInvocable ? skill.description : `${t('menu.userOnly')} · ${skill.description}`,
        }))
    },
    warm(session) {
      // Fire-and-forget scope-birth prewarm; the shared fetch reports
      // through candidates.
      fetchCatalog(session.sessionId).catch(() => {})
    },
    lexicon(session) {
      const disabled = loadDisabledSkills()
      return fetches.get(session.sessionId)?.settled
        ?.filter(skill => !disabled.has(skill.name))
        .map(skill => skill.name)
    },
    subscribeLexicon(session, listener) {
      const key = session.sessionId
      const listeners = lexiconListeners.get(key) ?? new Set()
      listeners.add(listener)
      lexiconListeners.set(key, listeners)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) lexiconListeners.delete(key)
      }
    },
    onPick({ candidate }) {
      // Plain-text-reference decision (web-input-machine note): the pick
      // lands plain text and the prompt ships the same
      // literal. Determinism lives host-side — the host's
      // pre-step boundary (dsh-tool-skill) recognizes the leading /name and
      // injects the rendered body for every entry point. A name shared with a
      // host command still resolves to the command: adjudication claims the
      // line client-side before it ever becomes a prompt.
      return { text: `/${candidate.name} ` }
    },
  }
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
  // A preset decides which skill providers an agent reads, so a switched
  // session's cached catalog belongs to the composition it no longer runs.
  ctx.remote.$on('agent-preset/selected', invalidate)
  ctx.remote.$on('skills/change', clearAll)
  ctx.on('connection/reset', clearAll)
  ctx.effect(() => {
    const unregister = inputTriggers.registerSource(source)
    return () => {
      unregister()
      clearAll()
    }
  }, 'ui-skill: source')

  ctx.slots.inject('conversation.input.plus', () => ctx.slots.register({
    name: 'conversation.input.plus',
    id: 'skill',
    order: 20,
    locale: NS,
    inject: (): SkillPlusInjected => ({
      openSkills: () => { ctx.layout.showPage('skills') },
    }),
  }, SkillPlusItem))

  ctx.slots.inject('shell.page', () => ctx.slots.register({
    name: 'shell.page',
    id: 'skills',
    order: 30,
    locale: NS,
    inject: (): SkillPageInjected => ({
      listSkills: async (sessionId: SessionId | undefined) => {
        try {
          const catalog = await fetchCatalog(sessionId)
          return catalog.map(skill => ({
            name: skill.name,
            description: skill.description,
            source: skill.source,
          }))
        } catch {
          // A failed catalog still opens the page; the empty copy is the recovery.
          return []
        }
      },
      subscribe: (listener) => {
        pageListeners.add(listener)
        return () => { pageListeners.delete(listener) }
      },
      setEnabled: (_name, _enabled) => {
        for (const key of [...fetches.keys()]) notifyLexicon(key as SessionId)
        notifyPages()
      },
      close: () => { ctx.layout.showPage('home') },
    }),
  }, SkillPage))
}
