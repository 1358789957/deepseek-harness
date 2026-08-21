/**
 * Client-local scheduled-job list. The host `schedule_*` tools are
 * session-scoped and model-facing; there is no user RPC, so this page keeps
 * name + cadence in `localStorage` and starts empty.
 */

/** How often a local scheduled job should fire. */
export type ScheduleCadence = 'hourly' | 'daily' | 'weekly'

/** One user-authored scheduled job stored in the harness browser. */
export interface ScheduledJob {
  id: string
  name: string
  cadence: ScheduleCadence
  createdAt: number
}

/** `localStorage` key for the scheduled-job list. Never seeded with samples. */
export const SCHEDULED_JOBS_KEY = 'dsh.scheduled-jobs'

const CADENCES: readonly ScheduleCadence[] = ['hourly', 'daily', 'weekly']

/** Cadence length used to compute 下次 / 已逾期 on the 总表. */
const PERIOD_MS: Record<ScheduleCadence, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

/** Official schedule_list delivery timing for one local row. */
export type ScheduledJobState = 'scheduled' | 'overdue'

/**
 * Next future occurrence aligned to `createdAt` + cadence.
 * @param createdAt - job creation time.
 * @param cadence - hourly / daily / weekly.
 * @param now - clock for tests.
 * @returns unix ms of the next run.
 */
export function nextRunAt(
  createdAt: number,
  cadence: ScheduleCadence,
  now: number = Date.now(),
): number {
  const period = PERIOD_MS[cadence]
  const first = createdAt + period
  if (now < first) return first
  const steps = Math.ceil((now - createdAt) / period)
  return createdAt + steps * period
}

/**
 * `scheduled` until the first slot passes; `overdue` after that (this page
 * does not dispatch, so a missed slot stays overdue).
 * @param createdAt - job creation time.
 * @param cadence - hourly / daily / weekly.
 * @param now - clock for tests.
 * @returns official schedule_list state words.
 */
export function scheduledJobState(
  createdAt: number,
  cadence: ScheduleCadence,
  now: number = Date.now(),
): ScheduledJobState {
  return now >= createdAt + PERIOD_MS[cadence] ? 'overdue' : 'scheduled'
}

/**
 * True when `value` is a stored scheduled job.
 * @param value - unknown JSON value.
 * @returns whether the value can be shown as a job row.
 */
function isScheduledJob(value: unknown): value is ScheduledJob {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<ScheduledJob>
  return typeof row.id === 'string'
    && row.id !== ''
    && typeof row.name === 'string'
    && row.name !== ''
    && typeof row.cadence === 'string'
    && (CADENCES as readonly string[]).includes(row.cadence)
    && typeof row.createdAt === 'number'
}

/**
 * Read scheduled jobs from storage. Invalid JSON or a blocked read yields
 * an empty list so the page still opens.
 * @param storage - `localStorage` or a test double.
 * @returns the stored jobs, oldest first.
 */
export function loadScheduledJobs(storage: Pick<Storage, 'getItem'> = localStorage): ScheduledJob[] {
  try {
    const raw = storage.getItem(SCHEDULED_JOBS_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isScheduledJob)
  } catch {
    // Invalid JSON or a blocked storage read; start empty rather than crash.
    return []
  }
}

/**
 * Persist the scheduled-job list. A blocked write is ignored so a private
 * mode still keeps the in-memory list for this visit.
 * @param jobs - the full list to store.
 * @param storage - `localStorage` or a test double.
 */
export function saveScheduledJobs(
  jobs: readonly ScheduledJob[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(SCHEDULED_JOBS_KEY, JSON.stringify(jobs))
  } catch {
    // Quota or a blocked storage write; the caller still holds `jobs`.
  }
}

/**
 * Append one scheduled job.
 * @param name - trimmed display name.
 * @param cadence - hourly / daily / weekly.
 * @param jobs - current list.
 * @returns the next list, or the same list when `name` is empty.
 */
export function addScheduledJob(
  name: string,
  cadence: ScheduleCadence,
  jobs: readonly ScheduledJob[],
): ScheduledJob[] {
  const trimmed = name.trim()
  if (trimmed === '') return jobs as ScheduledJob[]
  return [...jobs, {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    cadence,
    createdAt: Date.now(),
  }]
}

/**
 * Remove one scheduled job by id.
 * @param id - job id.
 * @param jobs - current list.
 * @returns the list without that id.
 */
export function removeScheduledJob(id: string, jobs: readonly ScheduledJob[]): ScheduledJob[] {
  return jobs.filter(job => job.id !== id)
}
