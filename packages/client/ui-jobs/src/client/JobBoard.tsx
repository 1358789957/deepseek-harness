/**
 * Center-column task board: every session's background jobs, same ordering
 * and status language as the header popover. Official name is 后台任务;
 * this surface keeps the approved sidebar label 任务看板.
 */
import { useEffect, useMemo, useState } from 'react'
import type { JobView, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { NS } from './locales.ts'
import { dotState, formatDuration, isLive, ordered, statusLabel } from './job-status.ts'
import css from './JobBoard.module.css'

/** Stable empty map so a host with no jobs keeps one object identity. */
const NO_JOBS: Readonly<Record<string, readonly JobView[]>> = {}

/** One board row: a job plus the session that can see it. */
interface BoardRow extends JobView {
  sessionId: SessionId
}

/** Injected navigation for a board row click. */
export interface JobBoardInjected {
  /**
   * Return to the conversation and open the job's session.
   * @param sessionId - session that owns or can see the job.
   */
  openSession: (sessionId: SessionId) => void
}

/** Full props of the task-board page. */
export type JobBoardProps =
  PropsRuntime<'shell.page'>
  & PropsLocale<typeof NS>
  & InjectFace<JobBoardInjected>

/**
 * Flatten every session's job list into one ordered board.
 * @param jobsBySession - last-wins mirror keyed by session.
 * @returns display-ordered rows carrying their session id.
 */
function flatten(jobsBySession: Readonly<Record<string, readonly JobView[]>>): BoardRow[] {
  const rows: BoardRow[] = []
  for (const [sessionId, jobs] of Object.entries(jobsBySession)) {
    for (const job of jobs) rows.push({ ...job, sessionId: sessionId as SessionId })
  }
  return ordered(rows)
}

/**
 * Render the running-jobs page.
 * @param props - shell page share, locale, and session open callback.
 * @returns the task board.
 */
export function JobBoard({ useSessions, openSession, t }: JobBoardProps) {
  const jobsBySession = useSessions(state => state.jobsBySession) ?? NO_JOBS
  const titles = useSessions(state => state.byId)
  const rows = useMemo(() => flatten(jobsBySession), [jobsBySession])
  const liveCount = useMemo(() => rows.filter(isLive).length, [rows])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (liveCount === 0) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [liveCount])

  return (
    <div className={css.page}>
      <h1 className={css.heading}>{t('board.title')}</h1>
      {rows.length === 0
        ? (
          <div className={css.empty}>
            <div className={css.emptyTitle}>{t('board.empty')}</div>
            <div className={css.emptyHint}>{t('board.emptyHint')}</div>
          </div>
        )
        : (
          <ul className={css.list} aria-label={t('list.aria')}>
            {rows.map((job) => {
              const live = isLive(job)
              const elapsed = live ? now - job.startedAt : (job.finishedAt ?? job.startedAt) - job.startedAt
              const duration = formatDuration(elapsed, t)
              const status = statusLabel(job.status, t)
              const sessionTitle = titles[job.sessionId]?.displayTitle
              return (
                <li key={`${job.sessionId}:${job.id}`}>
                  <button
                    type="button"
                    className={live ? css.row : `${css.row} ${css.rowSettled}`}
                    onClick={() => { openSession(job.sessionId) }}
                  >
                    <StateDot state={dotState(job.status)} className={css.rowDot} />
                    <span className={css.kind}>{job.kind}</span>
                    <span className={css.label} title={job.label}>{job.label}</span>
                    {sessionTitle !== undefined && sessionTitle !== '' && (
                      <span className={css.session}>{sessionTitle}</span>
                    )}
                    <span className={css.status} title={job.detail ?? status}>{job.detail ?? status}</span>
                    <span className={css.duration}>{duration}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}
