/**
 * Plus-menu Skill row: label plus a right chevron that opens the skill page.
 */
import { IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import css from './SkillPlusItem.module.css'

/** Injected navigation for the Skill plus row. */
export interface SkillPlusInjected {
  /** Close the plus menu and show the skill catalog page. */
  openSkills: () => void
}

/** Full props of the plus-menu Skill row. */
export type SkillPlusItemProps =
  PropsRuntime<'conversation.input.plus'>
  & PropsLocale<typeof NS>
  & InjectFace<SkillPlusInjected>

/**
 * Render the Skill plus-menu row.
 * @param props - plus-menu owner share and the page-open callback.
 * @returns the menu row.
 */
export function SkillPlusItem({ onClose, openSkills, t }: SkillPlusItemProps) {
  return (
    <div className={css.group}>
      <button
        type="button"
        role="menuitem"
        className={css.row}
        onClick={() => {
          onClose()
          openSkills()
        }}
      >
        <span>{t('plus')}</span>
        <IconChevronRightOutline14 className={css.chevron} />
      </button>
    </div>
  )
}
