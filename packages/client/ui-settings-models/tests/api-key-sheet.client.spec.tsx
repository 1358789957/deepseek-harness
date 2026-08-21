// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { ApiKeySheet, type ApiKeySheetProps } from '../src/client/ApiKeySheet.tsx'
import { INITIAL_API_KEY_SHEET, type ApiKeySheetState } from '../src/client/api-key-store.ts'
import { DEEPSEEK_CONSOLE_URL, DEEPSEEK_DOCS_URL } from '../src/client/deepseek-key-test.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const t: ApiKeySheetProps['t'] = makeTranslate(zh)
const FIXTURE = 'sk-fixture-not-a-real-key'

function rpc(ok: boolean, message = 'nope') {
  return {
    result: ok ? { ok: true as const } : { ok: false as const, error: { message } },
  }
}

function setup(
  state: Partial<ApiKeySheetState> = {},
  api: ApiKeySheetProps['api'] = {
    credentials: {
      set: vi.fn(async () => rpc(true)),
      unset: vi.fn(async () => rpc(true)),
    },
  } as never,
) {
  const store = createSnapshotStore<ApiKeySheetState>({
    ...INITIAL_API_KEY_SHEET,
    open: true,
    writable: true,
    ...state,
  })
  const closeSheet = vi.fn()
  const refresh = vi.fn(async () => {})
  const props = {
    useApiKey: bindSnapshotSelector(store),
    closeSheet,
    refresh,
    api,
    t,
  } as unknown as ApiKeySheetProps
  return { view: render(<ApiKeySheet {...props} />), closeSheet, refresh, api, store }
}

describe('ApiKeySheet', () => {
  it('renders nothing while closed', () => {
    const { view } = setup({ open: false })
    expect(view.container.innerHTML).toBe('')
  })

  it('saves a typed key write-only and never echoes the plaintext', async () => {
    const set = vi.fn(async () => rpc(true))
    const { refresh } = setup({ configured: false }, { credentials: { set, unset: vi.fn() } } as never)
    const field = screen.getByLabelText('API 密钥') as HTMLInputElement
    expect(field.type).toBe('password')
    fireEvent.change(field, { target: { value: FIXTURE } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => { expect(set).toHaveBeenCalledWith({ ref: 'DEEPSEEK_API_KEY', value: FIXTURE }) })
    expect(refresh).toHaveBeenCalled()
    expect((screen.getByLabelText('API 密钥') as HTMLInputElement).value).toBe('')
    expect(screen.queryByDisplayValue(FIXTURE)).toBeNull()
    expect(screen.queryByText(FIXTURE)).toBeNull()
  })

  it('refuses an empty save and a missing test draft', () => {
    setup({ configured: false })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByRole('status').textContent).toBe('请先输入 API 密钥。')
    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    expect(screen.getByRole('status').textContent).toBe('请先输入 API 密钥。')
  })

  it('asks to re-enter a stored key before testing', () => {
    setup({ configured: true })
    expect(screen.getByText('已设置')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    expect(screen.getByRole('status').textContent).toBe('请重新输入密钥后再测试。')
  })

  it('surfaces save, clear, and thrown credential failures', async () => {
    const set = vi.fn(async () => rpc(false, 'set failed'))
    setup({ configured: false }, { credentials: { set, unset: vi.fn() } } as never)
    fireEvent.change(screen.getByLabelText('API 密钥'), { target: { value: FIXTURE } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('set failed') })

    cleanup()
    const unset = vi.fn(async () => rpc(false, 'unset failed'))
    setup({ configured: true }, { credentials: { set: vi.fn(), unset } } as never)
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('unset failed') })

    cleanup()
    const exploding = vi.fn(async () => { throw new Error('boom') })
    setup({ configured: true }, { credentials: { set: vi.fn(), unset: exploding } } as never)
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('boom') })

    cleanup()
    const raw = vi.fn(async () => { throw 'raw' })
    setup({ configured: true }, { credentials: { set: vi.fn(), unset: raw } } as never)
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('raw') })
  })

  it('clears a stored key and probes typed keys', async () => {
    const unset = vi.fn(async () => rpc(true))
    const { refresh } = setup({ configured: true }, { credentials: { set: vi.fn(), unset } } as never)
    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    await waitFor(() => { expect(unset).toHaveBeenCalledWith({ ref: 'DEEPSEEK_API_KEY' }) })
    expect(refresh).toHaveBeenCalled()

    cleanup()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))
    setup({ configured: false })
    fireEvent.change(screen.getByLabelText('API 密钥'), { target: { value: FIXTURE } })
    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('密钥可用。') })

    cleanup()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    setup({ configured: false })
    fireEvent.change(screen.getByLabelText('API 密钥'), { target: { value: FIXTURE } })
    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('请求失败（401）。') })

    cleanup()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    setup({ configured: false })
    fireEvent.change(screen.getByLabelText('API 密钥'), { target: { value: FIXTURE } })
    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('浏览器拦了跨域，请到开放平台控制台验证。')
    })
  })

  it('locks save and clear when the launch environment owns the key', () => {
    setup({ writable: false, configured: true })
    expect(screen.getByText('由启动环境提供（只读）')).toBeTruthy()
    expect((screen.getByLabelText('API 密钥') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '保存' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '清除' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '测试' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('closes on Escape, mask, and the header button, and links the official consoles', () => {
    const { closeSheet, store, refresh } = setup({ open: true })
    expect(screen.getByRole('link', { name: 'API 文档' }).getAttribute('href')).toBe(DEEPSEEK_DOCS_URL)
    expect(screen.getByRole('link', { name: '开放平台控制台' }).getAttribute('href')).toBe(DEEPSEEK_CONSOLE_URL)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(closeSheet).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeSheet).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(closeSheet).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('presentation').firstElementChild!)
    expect(closeSheet).toHaveBeenCalledTimes(3)
    refresh.mockClear()
    act(() => { store.set({ ...store.getSnapshot(), open: false }) })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
