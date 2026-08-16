/**
 * Shell chrome content registered into the shell's trigger/header/search
 * seats: the trigger row icon + label (figma sidebar foot), the panel title
 * text, the nav search field, and the empty-search copy. The shell renders
 * the surrounding chrome (button, nav heading row) and reads each entry's
 * `label` option for aria text.
 */
import {
  IconSearchOutline16, IconSettingsOutline14, IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './chrome.module.css'

/** Trigger content props: the sidebar column state + the standard locale seat. */
export type TriggerContentProps = PropsRuntime<'settings.trigger'> & PropsLocale<'settings'>

/** Header content props: the standard locale seat only. */
export type HeaderContentProps = PropsRuntime<'settings.header'> & PropsLocale<'settings'>

/**
 * Render the trigger row content (icon; label only in the wide column).
 * @param props - composed slot props.
 * @returns the trigger content fragment.
 */
export function TriggerContent({ wide, t }: TriggerContentProps) {
  return (
    <>
      {wide ? <IconSettingsOutline16 size={16} /> : <IconSettingsOutline14 size={18} />}
      {wide && <span className={css.triggerLabel}>{t('trigger')}</span>}
      {wide && <span className={css.shortcut} aria-hidden="true">{t('trigger.shortcut')}</span>}
    </>
  )
}

/**
 * Render the panel title text.
 * @param props - composed slot props.
 * @returns the title text node.
 */
export function HeaderContent({ t }: HeaderContentProps) {
  return <>{t('title')}</>
}

/** Close-button label text props: the standard locale seat only. */
export type CloseLabelProps = PropsRuntime<'settings.close'> & PropsLocale<'settings'>

/**
 * Render the close button's visually-hidden label text.
 * @param props - composed slot props.
 * @returns the label text node.
 */
export function CloseLabel({ t }: CloseLabelProps) {
  return <>{t('close')}</>
}

/** Search-field props: the shell-owned query plus the standard locale seat. */
export type SearchFieldProps = PropsRuntime<'settings.search'> & PropsLocale<'settings'>

/**
 * Render the settings nav search field.
 * @param props - composed slot props.
 * @returns the labeled search input.
 */
export function SearchField({ query, onQuery, t }: SearchFieldProps) {
  return (
    <label className={css.search}>
      <IconSearchOutline16 className={css.searchIcon} size={14} aria-hidden="true" />
      <span className={css.hiddenLabel}>{t('search.placeholder')}</span>
      <input
        type="search"
        value={query}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        autoComplete="off"
        onChange={(event) => { onQuery(event.currentTarget.value) }}
      />
    </label>
  )
}

/** Empty-search copy props: the standard locale seat only. */
export type SearchEmptyProps = PropsRuntime<'settings.searchEmpty'> & PropsLocale<'settings'>

/**
 * Render the nav copy used when a search matches no section.
 * @param props - composed slot props.
 * @returns the empty-match text node.
 */
export function SearchEmpty({ t }: SearchEmptyProps) {
  return <>{t('search.empty')}</>
}
