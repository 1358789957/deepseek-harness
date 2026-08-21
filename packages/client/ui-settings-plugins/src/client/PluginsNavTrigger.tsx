/**
 * Wide sidebar row that opens the Settings Plugins section.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { PluginsSettingsLocaleKey } from './locales.ts'
import css from './PluginsNavTrigger.module.css'

/** Injected open action for the Plugins sidebar row. */
export interface PluginsNavTriggerInjected {
  /** Open Settings on the Plugins section and return the center column home. */
  openPlugins: () => void
}

/** Full props of the Plugins sidebar nav row. */
export type PluginsNavTriggerProps =
  PropsRuntime<'sidebar.nav'>
  & PropsLocale<'settings.plugins'>
  & InjectFace<PluginsNavTriggerInjected>

/**
 * Render the Plugins sidebar trigger.
 * @param props - sidebar nav owner share plus the open callback.
 * @returns the nav row, or null while the column is the compact rail.
 */
export function PluginsNavTrigger({ wide, t, openPlugins }: PluginsNavTriggerProps) {
  if (!wide) return null
  return (
    <button type="button" className={css.trigger} onClick={openPlugins}>
      {t('nav' satisfies PluginsSettingsLocaleKey)}
    </button>
  )
}
