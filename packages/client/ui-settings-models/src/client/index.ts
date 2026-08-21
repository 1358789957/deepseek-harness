/**
 * Models settings and product-onboarding plugin, browser half. It registers
 * the Models page plus the ordered internal-testing and official-DeepSeek
 * onboarding dialogs, whose UI shares this package's modal wrapper. The Host
 * settings and credential contracts stay behind their existing wire APIs.
 * Export discipline:
 * packages/client/AGENTS.md.
 */
import { createSnapshotStore, type ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
// Type-only: pulls the shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge and the forwarded-event key face
// (settings/credentials invalidations ride the allowlist) into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { ApiKeyPlusItem } from './ApiKeyPlusItem.tsx'
import type { ApiKeyPlusInjected } from './ApiKeyPlusItem.tsx'
import { ApiKeySheet } from './ApiKeySheet.tsx'
import type { ApiKeySheetInjected } from './ApiKeySheet.tsx'
import { INITIAL_API_KEY_SHEET } from './api-key-store.ts'
import { DEEPSEEK_API_KEY_REF } from './deepseek-key-test.ts'
import { ModelsSection } from './ModelsSection.tsx'
import type { ModelsSectionInjected } from './ModelsSection.tsx'
import { DeepSeekOnboardingDialog } from './DeepSeekOnboardingDialog.tsx'
import type { DeepSeekOnboardingInjected } from './DeepSeekOnboardingDialog.tsx'
import { WelcomeNotice } from './WelcomeNotice.tsx'
import type { WelcomeNoticeInjected } from './WelcomeNotice.tsx'
import { refreshWelcomeIfLoaded, WelcomeNoticeStore } from './welcome-store.ts'
import { ModelsSettingsStore } from './store.ts'
import { en, zh, type ModelsKey } from './locales.ts'
import { WELCOME_NOTICE_SETTINGS_NAMESPACE } from '../onboarding-copy.ts'

export type { ModelsSectionInjected, ModelsSectionProps } from './ModelsSection.tsx'
export type { ModelsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Models page + product-onboarding copy. */
    'settings.models': ModelsKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.models'
export type { ModelsSettingsState, ProviderRow } from './store.ts'

/**
 * Refetch the page snapshot only after its first load: an unopened Models
 * page must not fetch on background invalidations.
 * @param controller - the page store.
 */
export function refreshIfLoaded(controller: ModelsSettingsStore): void {
  if (controller.store.getSnapshot().status === 'idle') return
  void controller.load()
}

/**
 * Required services (cordis fiber inject). The target slot is declared by
 * ui-settings' apply, whose activation order relative to this one is NOT
 * constrained; registration depends on each slot through `slots.inject()`.
 */
export const inject = ['slots', 'locale', 'connection', 'remote']

/**
 * Register the Models section once the `settings.section` declaration is on
 * the ledger, wire its store to the connection, and keep it fresh on every
 * pushed invalidation (settings, credentials, or provider topology).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-models: copy dictionaries')

  const connection = ctx.get('connection') as ConnectionHandle
  const controller = new ModelsSettingsStore(connection.api)
  const useSnapshot = bindSnapshotSelector(controller.store)
  // Registration-time text (the nav label thunk) and the inject faces share
  // one bound translate; copy freshness rides the locale revision.
  const t = ctx.locale.bind(NS) as ModelsSectionInjected['t']
  const injected = (): ModelsSectionInjected => ({
    controller,
    useSnapshot,
    api: connection.api,
    t,
  })
  const deepSeekOnboardingInjected = (): DeepSeekOnboardingInjected => ({
    controller,
    hooks: { models: controller.store },
    api: connection.api,
    t,
  })
  const welcomeController = new WelcomeNoticeStore(
    connection.api,
    connection.isLoopback ? 'host' : 'memory',
  )
  const welcomeInjected = (): WelcomeNoticeInjected => ({
    controller: welcomeController,
    hooks: { welcome: welcomeController.store },
    t,
  })

  // Pushed invalidations converge every open surface without polling: any
  // settings/credentials/topology change refetches once the page loaded.
  ctx.effect(() => {
    const refreshModels = (): void => { refreshIfLoaded(controller) }
    const refreshAll = (): void => {
      refreshModels()
      refreshWelcomeIfLoaded(welcomeController)
    }
    const disposers = [
      ctx.remote.$on('settings/document-updated', (ns) => {
        refreshModels()
        if (ns === WELCOME_NOTICE_SETTINGS_NAMESPACE) refreshWelcomeIfLoaded(welcomeController)
      }),
      ctx.remote.$on('credentials/updated', refreshModels),
      ctx.remote.$on('llm/adapters-updated', refreshModels),
      ctx.on('connection/reset', refreshAll),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'ui-settings-models: pushed invalidations')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'models',
    order: 10,
    label: () => t('nav'),
    inject: injected,
  }, ModelsSection))
  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding',
    id: 'welcome-notice',
    order: -100,
    inject: welcomeInjected,
  }, WelcomeNotice))
  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding',
    id: 'deepseek-official',
    order: 0,
    inject: deepSeekOnboardingInjected,
  }, DeepSeekOnboardingDialog))

  const apiKeyStore = createSnapshotStore(INITIAL_API_KEY_SHEET)
  const refreshApiKey = async (): Promise<void> => {
    try {
      const response = await connection.api.credentials.describe({ refs: [DEEPSEEK_API_KEY_REF] })
      if (!response.result.ok) return
      const view = response.result.value.credentials[DEEPSEEK_API_KEY_REF]
      const current = apiKeyStore.getSnapshot()
      apiKeyStore.set({
        ...current,
        configured: view?.configured === true,
        writable: view?.writable !== false,
      })
    } catch {
      // describe failed; keep the last known configured/writable badges.
    }
  }
  const openSheet = (): void => {
    apiKeyStore.set({ ...apiKeyStore.getSnapshot(), open: true })
  }
  const closeSheet = (): void => {
    apiKeyStore.set({ ...apiKeyStore.getSnapshot(), open: false })
  }

  ctx.effect(() => ctx.remote.$on('credentials/updated', () => { void refreshApiKey() }), 'ui-settings-models: api-key badge')

  ctx.slots.inject('conversation.input.plus', () => ctx.slots.register({
    name: 'conversation.input.plus',
    id: 'api-key',
    order: 30,
    locale: NS,
    inject: (): ApiKeyPlusInjected => ({
      hooks: { apiKey: apiKeyStore },
      openSheet,
      refresh: refreshApiKey,
    }),
  }, ApiKeyPlusItem))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'api-key',
    order: 30,
    locale: NS,
    inject: (): ApiKeySheetInjected => ({
      hooks: { apiKey: apiKeyStore },
      closeSheet,
      refresh: refreshApiKey,
      api: connection.api,
    }),
  }, ApiKeySheet))
}
