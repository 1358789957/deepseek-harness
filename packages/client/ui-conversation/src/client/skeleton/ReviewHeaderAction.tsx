// Session-header utility: 审查 toggles the details / Review column.

import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './ReviewHeaderAction.module.css'

/** Injected toggle plus the bound details-open snapshot. */
export interface ReviewHeaderInjected {
  hooks: { detailsOpen: ObservableSnapshot<{ open: boolean }> }
  toggleDetails: () => void
}

/** Full props of the session-header Review utility. */
export type ReviewHeaderActionProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & InjectFace<ReviewHeaderInjected>
  & PropsLocale<'conversation'>

/**
 * Right-aligned 审查 control that opens or closes the Review column.
 * @param props - runtime kit, bound open bit, toggle, and locale seat.
 * @returns the header utility button.
 */
export function ReviewHeaderAction({ useDetailsOpen, toggleDetails, t }: ReviewHeaderActionProps) {
  const open = useDetailsOpen(state => state.open)
  return (
    <button
      type="button"
      className={css.trigger}
      aria-pressed={open}
      aria-label={open ? t('review.close') : t('review.open')}
      data-review-header=""
      onClick={() => { toggleDetails() }}
    >
      {t('review.title')}
    </button>
  )
}
