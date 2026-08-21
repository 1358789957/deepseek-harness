/**
 * Center-column skill catalog. Opened from the plus menu, not Settings → Plugins.
 * Left nav splits 内置 (bundled / `.agents/skills`) from 导入.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { NS } from './locales.ts'
import { isBuiltinSkillSource } from './skill-groups.ts'
import {
  loadDisabledSkills, saveDisabledSkills, setSkillEnabled,
} from './skill-enabled.ts'
import {
  addImportedSkill, loadImportedSkills, mergeSkillCatalog, saveImportedSkills,
} from './skill-imported.ts'
import { parseSkillMarkdown } from './parse-skill-md.ts'
import css from './SkillPage.module.css'

/** One catalog row the skill page can render. */
export interface SkillPageEntry {
  name: string
  description: string
  source: string
}

/** Injected catalog read, enable persist, and page close. */
export interface SkillPageInjected {
  /**
   * List user-visible skills for the current session, or the host cwd catalog
   * when there is no session.
   * @param sessionId - current session, or undefined on the hero.
   * @returns catalog rows; empty when the list fails.
   */
  listSkills: (sessionId: SessionId | undefined) => Promise<readonly SkillPageEntry[]>
  /**
   * Subscribe to catalog invalidation (`skills/change` and sibling drops).
   * @param listener - refetch callback.
   * @returns disposer.
   */
  subscribe: (listener: () => void) => () => void
  /**
   * Persist one row's enabled bit and drop it from the slash catalog when off.
   * @param name - skill name.
   * @param enabled - next checked state.
   */
  setEnabled: (name: string, enabled: boolean) => void
  /** Return the center column to the conversation. */
  close: () => void
}

/** Full props of the skill catalog page. */
export type SkillPageProps =
  PropsRuntime<'shell.page'>
  & PropsLocale<typeof NS>
  & InjectFace<SkillPageInjected>

type SkillGroup = 'builtin' | 'imported'

/**
 * Render the skill catalog page.
 * @param props - shell page share, locale, and catalog callbacks.
 * @returns the catalog page.
 */
export function SkillPage({
  useSessions, listSkills, subscribe, setEnabled, close, t,
}: SkillPageProps) {
  const sessionId = useSessions(state => state.current)
  const [skills, setSkills] = useState<readonly SkillPageEntry[]>([])
  const [imported, setImported] = useState(loadImportedSkills)
  const [importError, setImportError] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(loadDisabledSkills)
  const [group, setGroup] = useState<SkillGroup>('builtin')
  const [revision, setRevision] = useState(0)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => subscribe(() => { setRevision(value => value + 1) }), [subscribe])

  useEffect(() => {
    let stale = false
    void listSkills(sessionId).then((rows) => {
      if (!stale) setSkills(rows)
    }, () => {
      if (!stale) setSkills([])
    })
    return () => { stale = true }
  }, [listSkills, sessionId, revision])

  const catalog = useMemo(() => mergeSkillCatalog(skills, imported), [skills, imported])
  const builtin = useMemo(() => catalog.filter(skill => isBuiltinSkillSource(skill.source)), [catalog])
  const importedRows = useMemo(
    () => catalog.filter(skill => !isBuiltinSkillSource(skill.source)),
    [catalog],
  )
  const rows = group === 'builtin' ? builtin : importedRows
  const emptyCopy = group === 'builtin' ? t('page.empty') : t('page.emptyImported')

  const onImportFile = (file: File): void => {
    void file.text().then((text) => {
      const row = parseSkillMarkdown(text, file.name)
      if (row === null) {
        setImportError(t('page.importInvalid'))
        return
      }
      const next = addImportedSkill(row, imported)
      setImported(next)
      saveImportedSkills(next)
      setImportError(null)
      setGroup('imported')
    }, () => {
      setImportError(t('page.importInvalid'))
    })
  }

  const toggle = (name: string, enabled: boolean): void => {
    const next = setSkillEnabled(name, enabled, disabled)
    setDisabled(next)
    saveDisabledSkills(next)
    setEnabled(name, enabled)
  }

  return (
    <div className={css.page}>
      <div className={css.header}>
        <h1 className={css.heading}>{t('page.title')}</h1>
        <button type="button" className={css.close} aria-label={t('page.close')} onClick={close}>
          <IconCloseOutline16 size={14} />
        </button>
      </div>
      <div className={css.body}>
        <nav className={css.nav} aria-label={t('page.title')}>
          <button
            type="button"
            className={group === 'builtin' ? css.navOn : css.navItem}
            aria-current={group === 'builtin' ? 'page' : undefined}
            onClick={() => { setGroup('builtin') }}
          >
            {t('page.builtin')}
            <span className={css.count}>{builtin.length}</span>
          </button>
          <button
            type="button"
            className={group === 'imported' ? css.navOn : css.navItem}
            aria-current={group === 'imported' ? 'page' : undefined}
            onClick={() => { setGroup('imported') }}
          >
            {t('page.imported')}
            <span className={css.count}>{importedRows.length}</span>
          </button>
        </nav>
        <div className={css.content}>
          <div className={css.toolbar}>
            <button
              type="button"
              className={css.import}
              onClick={() => { fileRef.current?.click() }}
            >
              {t('page.import')}
            </button>
            <input
              ref={fileRef}
              className={css.file}
              type="file"
              accept=".md,text/markdown"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (file !== undefined) onImportFile(file)
              }}
            />
          </div>
          {importError !== null && <div className={css.importError} role="status">{importError}</div>}
          {rows.length === 0
            ? <div className={css.empty}>{emptyCopy}</div>
            : (
              <ul className={css.list}>
                {rows.map((skill) => {
                  const enabled = !disabled.has(skill.name)
                  return (
                    <li key={`${skill.source}:${skill.name}`} className={css.row}>
                      <label className={css.check}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          aria-label={t('page.enable', { name: skill.name })}
                          onChange={(event) => { toggle(skill.name, event.currentTarget.checked) }}
                        />
                      </label>
                      <div className={css.meta}>
                        <span className={css.name}>{skill.name}</span>
                        <span className={css.description}>{skill.description}</span>
                        <span className={css.source}>{skill.source}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
      </div>
    </div>
  )
}
