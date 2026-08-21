/**
 * Settings shell root: the sidebar-foot trigger row plus the centered modal
 * panel (figma 501:29947, 1080x700) with the section nav rail. The shell is
 * a pure composition face — every piece of text (trigger label, panel title,
 * nav search, close label, sections) arrives from registrants through slots;
 * accessible names resolve to that content (trigger: its own text; dialog:
 * aria-labelledby the title node; close: visually-hidden slot text). Modal
 * open state and the active section id live on the settingsPanel snapshot;
 * the nav query stays component-local. Ctrl/Cmd+, toggles the panel unless
 * an editor is focused.
 * The onboarding coordinator mounts exactly one ordered registrant while the
 * sessions-derived empty-Hero fact is active. Visible dialog chrome belongs
 * to the step, so a mounted-but-deciding step paints nothing here.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  IconAgentPresetOutline16, IconCloseOutline16, IconDataOutline16,
  IconPersonalizationOutline16, IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsRootComponentProps, SettingsSectionRow } from './shell-contract.ts'
import css from './SettingsRoot.module.css'

/** True when the event target is an editor that should keep Ctrl/Cmd+, . */
function isEditor(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.matches('input, textarea, select')) return true
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

/** Nav glyph by section id; unknown ids fall back to the settings gear. */
function navIcon(id: string) {
  if (id === 'models') return <IconDataOutline16 className={css.navIcon} size={16} />
  if (id === 'agent-presets') return <IconAgentPresetOutline16 className={css.navIcon} size={16} />
  if (id === 'plugins') return <IconPersonalizationOutline16 className={css.navIcon} size={16} />
  return <IconSettingsOutline16 className={css.navIcon} size={16} />
}

type PanelProps = {
  rows: readonly SettingsSectionRow[]
  renderSlot: SettingsRootComponentProps['renderSlot']
  activeId: string | undefined
  onSelect: (id: string) => void
  onClose: () => void
}

/**
 * The modal layer: full-viewport mask + centered panel. Close paths: the
 * header button, a mask click, and document-level Escape (mounted only while
 * open, so the listener lifetime is the panel's). Escape clears a non-empty
 * nav query before it closes the panel.
 */
function SettingsPanel({ rows, renderSlot, activeId, onSelect, onClose }: PanelProps) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLocaleLowerCase()
  const visible = needle === ''
    ? rows
    : rows.filter(row => row.label.toLocaleLowerCase().includes(needle))
  // Entries can unmount underneath the requested id, and a search can hide
  // it, so the render-time projection falls back to the first visible row.
  const active = visible.find(r => r.id === activeId)?.id ?? visible[0]?.id
  const titleId = useId()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (query !== '') {
        setQuery('')
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose, query])

  // Baseline focus management: entering the dialog lands on the close button.
  const closeButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { closeButton.current?.focus() }, [])

  return (
    <div className={css.overlay} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={onClose} />
      <div className={css.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <nav className={css.nav}>
          <div className={css.navTitle} id={titleId}>{renderSlot('settings.header', {})}</div>
          {renderSlot('settings.search', { query, onQuery: setQuery })}
          <div className={css.navList}>
            {visible.map(row => (
              <button
                key={row.id}
                type="button"
                className={clsx(css.navCell, row.id === active && css.active)}
                aria-current={row.id === active ? 'true' : undefined}
                onClick={() => { onSelect(row.id) }}
              >
                {navIcon(row.id)}
                <span className={css.navLabel}>{row.label}</span>
              </button>
            ))}
            {needle !== '' && visible.length === 0 && (
              <div className={css.navEmpty}>{renderSlot('settings.searchEmpty', {})}</div>
            )}
          </div>
        </nav>
        <div className={css.content}>
          <div className={css.header}>
            <div className={css.actions}>{renderSlot('settings.action', {})}</div>
            <button ref={closeButton} type="button" className={css.close} onClick={onClose}>
              <IconCloseOutline16 size={14} />
              <span className={css.hiddenLabel}>{renderSlot('settings.close', {})}</span>
            </button>
          </div>
          <div className={css.options}>
            {active !== undefined && renderSlot('settings.section', { close: onClose }, { only: active })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Render the settings trigger and panel.
 * @param props - composed slot props (contract/slots.ts).
 * @returns the settings shell element tree.
 */
export function SettingsRoot(props: SettingsRootComponentProps) {
  const {
    wide, useSections, useOnboardingSteps, useSessions, usePanel,
    openPanel, closePanel, renderSlot,
  } = props
  const panel = usePanel(s => s)
  const open = panel.open
  const activeId = panel.sectionId
  const [completedOnboarding, setCompletedOnboarding] = useState<ReadonlySet<string>>(() => new Set())
  const close = useCallback(() => { closePanel() }, [closePanel])
  const openSection = useCallback((id: string) => { openPanel(id) }, [openPanel])

  // The ledger tick keeps the nav rows fresh: registrants re-register with
  // freshly localized text on locale change, and the trigger/header/search
  // seats re-render through their own outlets' subscriptions.
  const rows = useSections(s => s)
  const onboardingSteps = useOnboardingSteps(s => s)
  const onboardingActive = useSessions(state =>
    state.phase === 'ready'
    && (state.current === undefined || state.byId[state.current]?.blank === true))
  const onboardingStep = onboardingActive
    ? onboardingSteps.find(step => !completedOnboarding.has(step.id))
    : undefined

  useEffect(() => {
    if (onboardingActive) return
    setCompletedOnboarding(new Set())
  }, [onboardingActive])

  const completeOnboardingStep = useCallback((id: string) => {
    setCompletedOnboarding((previous) => {
      if (previous.has(id)) return previous
      return new Set([...previous, id])
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Comma' || event.altKey || event.shiftKey
        || !(event.ctrlKey || event.metaKey) || isEditor(event.target)) return
      event.preventDefault()
      if (open) close()
      else openPanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [close, open, openPanel])

  return (
    <>
      <button
        type="button"
        className={clsx(css.trigger, !wide && css.rail)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Control+Comma Meta+Comma"
        onClick={() => { openPanel() }}
      >
        {renderSlot('settings.trigger', { wide })}
      </button>
      {open && (
        <SettingsPanel
          rows={rows}
          renderSlot={renderSlot}
          activeId={activeId}
          onSelect={openSection}
          onClose={close}
        />
      )}
      {/* Dialog chrome and `#root` inert ownership live inside each step's
          visible branch. A step still deciding (private facts loading)
          renders null, so nothing paints or blocks while it decides. */}
      {onboardingStep !== undefined && renderSlot('settings.onboarding', {
        stepId: onboardingStep.id,
        complete: () => { completeOnboardingStep(onboardingStep.id) },
        openSection,
      }, { only: onboardingStep.id })}
    </>
  )
}
