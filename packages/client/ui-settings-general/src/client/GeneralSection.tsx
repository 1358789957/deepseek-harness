/** The General section: one column rendering feature-owned item contributions. */
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './GeneralSection.module.css'

/** Full component props: section owner share plus item render share. */
export type GeneralSectionComponentProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings'>
  & PropsRenderSlots<'settings.general.item'>

/**
 * Render the General section content column.
 * @param props - composed slot props (contract/slots.ts).
 * @returns the section element tree.
 */
export function GeneralSection({ renderSlot, t }: GeneralSectionComponentProps) {
  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('general.nav')}</h2>
      {renderSlot('settings.general.item', {})}
    </div>
  )
}
