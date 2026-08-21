/**
 * Plus-menu API-key row: 未设置 / 已设置, then opens the write-only sheet.
 */
import { useEffect } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ApiKeySheetState } from './api-key-store.ts'
import css from './ApiKeyPlusItem.module.css'

/** Injected sheet open and configured-bit snapshot. */
export interface ApiKeyPlusInjected {
  hooks: {
    /** Configured/writable/open snapshot bound as useApiKey. */
    apiKey: SnapshotStore<ApiKeySheetState>
  }
  /** Open the API-key sheet. */
  openSheet: () => void
  /** Refresh the configured bit from credentials.describe. */
  refresh: () => Promise<void>
}

/** Full props of the plus-menu API-key row. */
export type ApiKeyPlusItemProps =
  PropsRuntime<'conversation.input.plus'>
  & PropsLocale<'settings.models'>
  & InjectFace<ApiKeyPlusInjected>

/**
 * Render the API-key plus-menu row.
 * @param props - plus-menu owner share and the sheet face.
 * @returns the menu row.
 */
export function ApiKeyPlusItem({
  onClose, openSheet, refresh, useApiKey, t,
}: ApiKeyPlusItemProps) {
  const configured = useApiKey(state => state.configured)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className={css.group}>
      <button
        type="button"
        role="menuitem"
        className={css.row}
        onClick={() => {
          onClose()
          openSheet()
        }}
      >
        <span>{t('plusApiKey')}</span>
        <span className={css.state}>{configured ? t('plusConfigured') : t('plusMissing')}</span>
      </button>
    </div>
  )
}
