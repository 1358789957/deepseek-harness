// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { ApiKeyPlusItem, type ApiKeyPlusItemProps } from '../src/client/ApiKeyPlusItem.tsx'
import { INITIAL_API_KEY_SHEET, type ApiKeySheetState } from '../src/client/api-key-store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t: ApiKeyPlusItemProps['t'] = makeTranslate(zh)

function setup(state: Partial<ApiKeySheetState> = {}) {
  const store = createSnapshotStore<ApiKeySheetState>({ ...INITIAL_API_KEY_SHEET, ...state })
  const onClose = vi.fn()
  const openSheet = vi.fn()
  const refresh = vi.fn(() => Promise.resolve())
  const props = {
    onClose,
    openSheet,
    refresh,
    useApiKey: bindSnapshotSelector(store),
    t,
  } as unknown as ApiKeyPlusItemProps
  return { view: render(<ApiKeyPlusItem {...props} />), onClose, openSheet, refresh }
}

describe('ApiKeyPlusItem', () => {
  it('refreshes the configured badge and opens the sheet after closing the menu', () => {
    const missing = setup()
    expect(missing.refresh).toHaveBeenCalledOnce()
    expect(screen.getByText('未设置')).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: /API 密钥/ }))
    expect(missing.onClose).toHaveBeenCalledOnce()
    expect(missing.openSheet).toHaveBeenCalledOnce()
    cleanup()
    setup({ configured: true })
    expect(screen.getByText('已设置')).toBeTruthy()
  })
})
