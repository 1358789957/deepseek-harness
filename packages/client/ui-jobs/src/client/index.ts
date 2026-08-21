/**
 * Background-job plugin, browser half: session-header popover, sidebar task
 * board (官方 后台任务), and a client-local scheduled-jobs page.
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { JobListAction } from './JobListAction.tsx'
import { JobBoard } from './JobBoard.tsx'
import type { JobBoardInjected } from './JobBoard.tsx'
import { SchedulePage } from './SchedulePage.tsx'
import { SidebarPageNav } from './SidebarPageNav.tsx'
import type { SidebarPageNavInjected } from './SidebarPageNav.tsx'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { en, NS, zh, type JobKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Background-job list copy. */
    'job': JobKey
  }
}

export type { JobListActionProps } from './JobListAction.tsx'

/** Required services for locale, slots, layout pages, and session open. */
export const inject = ['sessions', 'slots', 'locale', 'layout']

/**
 * Client plugin body: register dictionaries, header action, sidebar nav, and pages.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-job: dictionaries')
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'job-list',
      // After the subagent catalog: session lineage reads before process work.
      order: 20,
      locale: NS,
    }, JobListAction),
  )

  const showPage = (page: string): void => { ctx.layout.showPage(page) }
  ctx.slots.inject('sidebar.nav', function* () {
    yield ctx.slots.register({
      name: 'sidebar.nav',
      id: 'jobs',
      order: 10,
      locale: NS,
      inject: (): SidebarPageNavInjected => ({ pageId: 'jobs', showPage }),
    }, SidebarPageNav)
    yield ctx.slots.register({
      name: 'sidebar.nav',
      id: 'schedule',
      order: 20,
      locale: NS,
      inject: (): SidebarPageNavInjected => ({ pageId: 'schedule', showPage }),
    }, SidebarPageNav)
  })

  ctx.slots.inject('shell.page', function* () {
    yield ctx.slots.register({
      name: 'shell.page',
      id: 'jobs',
      order: 10,
      locale: NS,
      inject: (): JobBoardInjected => ({
        openSession: (sessionId: SessionId) => {
          ctx.layout.showPage('home')
          ctx.sessions.open(sessionId)
        },
      }),
    }, JobBoard)
    yield ctx.slots.register({
      name: 'shell.page',
      id: 'schedule',
      order: 20,
      locale: NS,
    }, SchedulePage)
  })
}
