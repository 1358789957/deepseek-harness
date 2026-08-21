/**
 * Center-column scheduled-jobs 总表: add / list / delete client-local jobs.
 * This is not the official 后台任务 registry. Host `schedule_*` tools stay
 * session-scoped and model-facing; this table is the user renderer.
 */
import { useState, type FormEvent } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { NS } from './locales.ts'
import {
  addScheduledJob, loadScheduledJobs, nextRunAt, removeScheduledJob,
  saveScheduledJobs, scheduledJobState, type ScheduleCadence,
} from './scheduled-jobs.ts'
import css from './SchedulePage.module.css'

/** Full props of the scheduled-jobs page. */
export type SchedulePageProps =
  PropsRuntime<'shell.page'>
  & PropsLocale<typeof NS>

/**
 * Render the scheduled-jobs master table.
 * @param props - shell page share and locale.
 * @returns the schedule editor.
 */
export function SchedulePage({ t }: SchedulePageProps) {
  const [jobs, setJobs] = useState(loadScheduledJobs)
  const [name, setName] = useState('')
  const [cadence, setCadence] = useState<ScheduleCadence>('daily')
  const now = Date.now()

  const commit = (next: typeof jobs): void => {
    setJobs(next)
    saveScheduledJobs(next)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const next = addScheduledJob(name, cadence, jobs)
    if (next === jobs) return
    commit(next)
    setName('')
  }

  return (
    <div className={css.page}>
      <h1 className={css.heading}>{t('schedule.title')}</h1>
      <form className={css.form} onSubmit={onSubmit}>
        <input
          className={css.name}
          type="text"
          value={name}
          onChange={(event) => { setName(event.currentTarget.value) }}
          placeholder={t('schedule.name')}
          autoComplete="off"
        />
        <select
          className={css.cadence}
          value={cadence}
          aria-label={t('schedule.cadence')}
          onChange={(event) => { setCadence(event.currentTarget.value as ScheduleCadence) }}
        >
          <option value="hourly">{t('schedule.hourly')}</option>
          <option value="daily">{t('schedule.daily')}</option>
          <option value="weekly">{t('schedule.weekly')}</option>
        </select>
        <button className={css.add} type="submit">{t('schedule.add')}</button>
      </form>
      {jobs.length === 0
        ? <div className={css.empty}>{t('schedule.empty')}</div>
        : (
          <table className={css.table}>
            <thead>
              <tr>
                <th>{t('schedule.col.name')}</th>
                <th>{t('schedule.col.rule')}</th>
                <th>{t('schedule.col.state')}</th>
                <th>{t('schedule.col.next')}</th>
                <th>{t('schedule.col.action')}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const state = scheduledJobState(job.createdAt, job.cadence, now)
                return (
                  <tr key={job.id}>
                    <td>{job.name}</td>
                    <td>{t(`schedule.${job.cadence}`)}</td>
                    <td>{t(`schedule.state.${state}`)}</td>
                    <td>{new Date(nextRunAt(job.createdAt, job.cadence, now)).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className={css.remove}
                        aria-label={t('schedule.delete')}
                        onClick={() => { commit(removeScheduledJob(job.id, jobs)) }}
                      >
                        {t('schedule.delete')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
    </div>
  )
}
