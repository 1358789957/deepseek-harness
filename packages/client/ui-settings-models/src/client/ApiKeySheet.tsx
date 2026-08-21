/**
 * Write-only DeepSeek API-key sheet: password, save, clear, and a models probe.
 * After save the field is cleared and the row shows 已设置; the plaintext
 * never reappears and is never logged.
 */
import { useEffect, useId, useState, type FormEvent } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { ApiKeySheetState } from './api-key-store.ts'
import {
  DEEPSEEK_API_KEY_REF, DEEPSEEK_CONSOLE_URL, DEEPSEEK_DOCS_URL, testDeepSeekApiKey,
} from './deepseek-key-test.ts'
import css from './ApiKeySheet.module.css'

/** Injected credentials face for the overlay sheet. */
export interface ApiKeySheetInjected {
  hooks: {
    /** Configured/writable/open snapshot bound as useApiKey. */
    apiKey: SnapshotStore<ApiKeySheetState>
  }
  /** Close the sheet without writing. */
  closeSheet: () => void
  /** Refresh configured/writable from credentials.describe. */
  refresh: () => Promise<void>
  /** Write-only credentials RPC. */
  api: Pick<IApiClient, 'credentials'>
}

/** Full props of the API-key overlay sheet. */
export type ApiKeySheetProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<'settings.models'>
  & InjectFace<ApiKeySheetInjected>

/**
 * Render the API-key sheet, or null while closed.
 * @param props - overlay share, locale, and credentials face.
 * @returns the sheet, or null.
 */
export function ApiKeySheet({
  useApiKey, closeSheet, refresh, api, t,
}: ApiKeySheetProps) {
  const { open, configured, writable } = useApiKey(state => state)
  const titleId = useId()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDraft('')
      setMessage(null)
      return
    }
    void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeSheet()
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [closeSheet, open])

  if (!open) return null

  const run = async (work: () => Promise<string | null>): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      setMessage(await work())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const onSave = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const value = draft.trim()
    if (value === '') {
      setMessage(t('plusEmpty'))
      return
    }
    void run(async () => {
      const stored = await api.credentials.set({ ref: DEEPSEEK_API_KEY_REF, value })
      if (!stored.result.ok) return stored.result.error.message
      setDraft('')
      await refresh()
      return null
    })
  }

  const onClear = (): void => {
    void run(async () => {
      const cleared = await api.credentials.unset({ ref: DEEPSEEK_API_KEY_REF })
      if (!cleared.result.ok) return cleared.result.error.message
      setDraft('')
      await refresh()
      return null
    })
  }

  const onTest = (): void => {
    if (draft.trim() === '') {
      setMessage(configured ? t('plusReenter') : t('plusEmpty'))
      return
    }
    void run(async () => {
      const result = await testDeepSeekApiKey(draft)
      switch (result.kind) {
        case 'ok': return t('plusOk')
        case 'http': return t('plusHttp', { status: result.status })
        case 'cors': return t('plusCors')
        /* v8 ignore next -- onTest already returns before calling with an empty draft */
        case 'empty': return t('plusEmpty')
      }
    })
  }

  return (
    <div className={css.layer} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={closeSheet} />
      <div className={css.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={css.header}>
          <h1 className={css.title} id={titleId}>{t('plusApiKey')}</h1>
          <button type="button" className={css.close} aria-label={t('close')} onClick={closeSheet}>
            <IconCloseOutline16 size={14} />
          </button>
        </div>
        {configured && <div className={css.badge}>{t('plusConfigured')}</div>}
        {!writable && <div className={css.hint}>{t('keyEnvLocked')}</div>}
        <form className={css.form} onSubmit={onSave}>
          <input
            className={css.field}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            disabled={!writable || busy}
            placeholder={configured ? t('keyStored') : t('keyPlaceholder')}
            aria-label={t('keyInput')}
            onChange={(event) => { setDraft(event.currentTarget.value) }}
          />
          <div className={css.actions}>
            <button className={css.primary} type="submit" disabled={!writable || busy}>{t('plusSave')}</button>
            <button className={css.ghost} type="button" disabled={!writable || busy} onClick={onClear}>
              {t('plusClear')}
            </button>
            <button className={css.ghost} type="button" disabled={busy} onClick={onTest}>
              {t('plusTest')}
            </button>
          </div>
        </form>
        <div className={css.links}>
          <a href={DEEPSEEK_DOCS_URL} target="_blank" rel="noreferrer">{t('plusDocs')}</a>
          <a href={DEEPSEEK_CONSOLE_URL} target="_blank" rel="noreferrer">{t('plusConsole')}</a>
        </div>
        {message !== null && <div className={css.message} role="status">{message}</div>}
      </div>
    </div>
  )
}
