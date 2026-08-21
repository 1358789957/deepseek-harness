/**
 * Wide sidebar row that shows a center-column page.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { NS } from './locales.ts'
import css from './SidebarPageNav.module.css'

/** Injected page identity and layout write. */
export interface SidebarPageNavInjected {
  /** `shell.page` id this row opens. */
  pageId: 'jobs' | 'schedule'
  /**
   * Show that page.
   * @param page - `'home'` or a `shell.page` id.
   */
  showPage: (page: string) => void
}

/** Full props of one jobs/schedule sidebar row. */
export type SidebarPageNavProps =
  PropsRuntime<'sidebar.nav'>
  & PropsLocale<typeof NS>
  & InjectFace<SidebarPageNavInjected>

/**
 * Render a wide-only sidebar page trigger.
 * @param props - nav owner share plus the target page.
 * @returns the nav row, or null while the column is the compact rail.
 */
export function SidebarPageNav({ wide, page, pageId, showPage, t }: SidebarPageNavProps) {
  if (!wide) return null
  return (
    <button
      type="button"
      className={css.trigger}
      aria-current={page === pageId ? 'page' : undefined}
      onClick={() => { showPage(pageId) }}
    >
      {t(pageId === 'jobs' ? 'board.nav' : 'schedule.nav')}
    </button>
  )
}
