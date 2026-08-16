// ReviewPane: Codex-like Review body — 变更 / 提交 / 任务. Pure props; the
// host (DetailsPanel) selects snapshot hunks, deliverables, and the todos
// projection. Empty sections stay mounted with honest empty copy. No fake
// git SHAs or invented +/- counts.

import { useId } from 'react'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client'
import type { DetailsSlotProps } from '../contract/slots.ts'
import { reviewBasename, type ReviewChanges } from './review-material.ts'
import css from './ReviewPane.module.css'

/** Presentational props: already-selected Review facts plus the locale seat. */
export interface ReviewPaneProps extends ReviewChanges {
  readonly todos: readonly TodoItem[]
  readonly t: DetailsSlotProps['t']
  /** Open a listed path through the same host opener the chat rows use. */
  readonly openFile: (path: string) => void
}

/* v8 ignore next 3 -- closed-union backstop; only reached if status is forged */
function assertNever(value: never): never {
  throw new Error(`unreachable todo status: ${String(value)}`)
}

function CompletedGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={css.glyphCompleted}>
      <circle cx="7" cy="7" r="6.4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M10.9631 5.71411L7.70154 8.97571C7.48011 9.19714 7.27736 9.40099 7.09229 9.54993C6.89742 9.70669 6.66314 9.85279 6.3634 9.90027C6.2049 9.92534 6.04339 9.92534 5.88489 9.90027C5.58515 9.85279 5.35087 9.70669 5.15601 9.54993C4.97093 9.40099 4.76818 9.19714 4.54675 8.97571L3.03516 7.46411L3.96313 6.53613L5.47473 8.04773C5.7169 8.28989 5.86196 8.43389 5.97888 8.52795C6.08597 8.61409 6.10875 8.60701 6.08997 8.604C6.11259 8.60758 6.13571 8.60758 6.15833 8.604C6.13954 8.60701 6.16232 8.61409 6.26941 8.52795C6.38633 8.43389 6.53139 8.28989 6.77356 8.04773L10.0352 4.78613L10.9631 5.71411Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ProgressGlyph() {
  const gradientId = useId()
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={css.glyphProgress}>
      <defs>
        <linearGradient id={gradientId} x1="2.5" y1="12" x2="10.5" y2="3.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="7" cy="7" r="6.4" stroke={`url(#${gradientId})`} strokeWidth="1.2" />
    </svg>
  )
}

function PendingGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={css.glyphPending}>
      <circle cx="7" cy="7" r="6.4" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.4" />
    </svg>
  )
}

function StatusGlyph({ status }: { status: TodoItem['status'] }) {
  switch (status) {
    case 'completed': return <CompletedGlyph />
    case 'in_progress': return <ProgressGlyph />
    case 'pending': return <PendingGlyph />
    /* v8 ignore next -- closed TodoItem status union */
    default: return assertNever(status)
  }
}

function FileStats({ added, removed }: { added: number; removed: number }) {
  return (
    <span className={css.fileStats}>
      <span className={css.add}>+{added}</span>
      <span className={css.del}>−{removed}</span>
    </span>
  )
}

/**
 * Codex-like Review body: three standing sections over real session facts.
 * @param props - selected changes, produced paths, todos, and locale seat.
 * @returns the three Review sections.
 */
export function ReviewPane({ files, added, removed, produced, todos, t, openFile }: ReviewPaneProps) {
  return (
    <div className={css.root}>
      <section className={css.section} data-review-section="changes">
        <div className={css.sectionHead}>
          <div className={css.sectionLabel}>{t('review.changes')}</div>
          {added !== null && removed !== null && (
            <div className={css.sectionStats} aria-label={t('review.changes.stats', { added, removed })}>
              <span className={css.add}>+{added}</span>
              <span className={css.del}>−{removed}</span>
            </div>
          )}
        </div>
        {files.length === 0
          ? <div className={css.empty}>{t('review.changes.empty')}</div>
          : (
            <ul className={css.list}>
              {files.map(file => (
                <li key={file.path}>
                  <button
                    type="button"
                    className={css.file}
                    data-review-file={file.path}
                    title={file.path}
                    onClick={() => { openFile(file.path) }}
                  >
                    <span className={css.fileName}>{reviewBasename(file.path)}</span>
                    {file.added !== undefined && file.removed !== undefined
                      ? <FileStats added={file.added} removed={file.removed} />
                      : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className={css.section} data-review-section="commits">
        <div className={css.sectionLabel}>{t('review.commits')}</div>
        <div className={css.empty}>{t('review.commits.empty')}</div>
        {produced.length > 0 && (
          <>
            <div className={css.subLabel}>{t('review.produced')}</div>
            <ul className={css.list}>
              {produced.map(path => (
                <li key={path}>
                  <button
                    type="button"
                    className={css.file}
                    data-review-produced={path}
                    title={path}
                    onClick={() => { openFile(path) }}
                  >
                    <span className={css.fileName}>{reviewBasename(path)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={css.section} data-review-section="tasks">
        <div className={css.sectionLabel}>{t('review.tasks')}</div>
        {todos.length === 0
          ? <div className={css.empty}>{t('review.tasks.empty')}</div>
          : (
            <ul className={css.list}>
              {todos.map(item => (
                <li
                  key={item.content}
                  className={css.todo}
                  data-review-todo={item.status}
                  data-status={item.status}
                >
                  <span className={css.glyph} aria-hidden><StatusGlyph status={item.status} /></span>
                  <span className={css.todoContent}>{item.content}</span>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}
