import { useEffect } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { IconCodeOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
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

function isEditor(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.matches('input, textarea, select')) return true
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

/** True when AppFrame is mounted and the details track cannot be allocated. */
function detailsTrackUnavailable(): boolean {
  const frame = document.querySelector('[data-app-frame]')
  return frame !== null && !frame.hasAttribute('data-details-available')
}

/**
 * Right-aligned 审查 control that opens or closes the Review column.
 * @param props - runtime kit, bound open bit, toggle, and locale seat.
 * @returns the header utility button.
 */
export function ReviewHeaderAction({ useDetailsOpen, toggleDetails, t }: ReviewHeaderActionProps) {
  const open = useDetailsOpen(state => state.open)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== 'KeyB' || !event.altKey || !(event.metaKey || event.ctrlKey) || isEditor(event.target)) return
      if (detailsTrackUnavailable()) return
      event.preventDefault()
      toggleDetails()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [toggleDetails])
  return (
    <button
      type="button"
      className={css.trigger}
      aria-pressed={open}
      aria-keyshortcuts="Meta+Alt+B Control+Alt+B"
      aria-label={open ? t('review.close') : t('review.open')}
      data-review-header=""
      onClick={() => { toggleDetails() }}
    >
      <IconCodeOutline16 />
      <span>{t('review.title')}</span>
    </button>
  )
}
