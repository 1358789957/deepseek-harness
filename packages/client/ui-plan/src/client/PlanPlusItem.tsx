/**
 * Plus-menu Plan toggle: always visible, 开/关, /plan and /plan off.
 */
import { useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-plan-mode/client'
import css from './PlanPlusItem.module.css'

/** Injected /plan command face for the plus-menu row. */
export interface PlanPlusInjected {
  /**
   * Enter plan mode by executing /plan.
   * @returns null on admitted execution; a user-visible failure line otherwise.
   */
  enterPlanMode: (() => Promise<string | null>) | undefined
  /**
   * Leave plan mode by executing /plan off.
   * @returns null on admitted execution; a user-visible failure line otherwise.
   */
  exitPlanMode: (() => Promise<string | null>) | undefined
}

/** Full props of the plus-menu Plan row. */
export type PlanPlusItemProps =
  PropsRuntime<'conversation.input.plus'>
  & InjectFace<PlanPlusInjected>
  & PropsLocale<'plan'>

/**
 * Render the Plan toggle row.
 * @param props - plus-menu owner share and command callbacks.
 * @returns the menu row.
 */
export function PlanPlusItem({
  locked, onClose, enterPlanMode, exitPlanMode, useProjection, t,
}: PlanPlusItemProps) {
  const plan = useProjection('plan')
  const active = plan !== undefined && (plan.pending ? !plan.active : plan.active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = locked || busy || (active ? exitPlanMode : enterPlanMode) === undefined

  const toggle = (): void => {
    const run = active ? exitPlanMode : enterPlanMode
    if (run === undefined || disabled) return
    setBusy(true)
    setError(null)
    void run().then((failure) => {
      setBusy(false)
      setError(failure)
      if (failure === null) onClose()
    }, (reason: unknown) => {
      setBusy(false)
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }

  return (
    <div>
      <button
        type="button"
        role="menuitem"
        className={css.row}
        disabled={disabled}
        aria-label={active ? t('chip.on.aria') : t('chip.off.aria')}
        onClick={toggle}
      >
        <span>Plan</span>
        <span className={css.state}>{active ? t('plus.on') : t('plus.off')}</span>
      </button>
      {error !== null && <div className={css.error} role="status">{error}</div>}
    </div>
  )
}
