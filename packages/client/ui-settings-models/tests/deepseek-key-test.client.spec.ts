import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEEPSEEK_API_KEY_REF, DEEPSEEK_CONSOLE_URL, DEEPSEEK_DOCS_URL, DEEPSEEK_MODELS_URL,
  testDeepSeekApiKey,
} from '../src/client/deepseek-key-test.ts'
import { INITIAL_API_KEY_SHEET } from '../src/client/api-key-store.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

const FIXTURE = 'sk-fixture-not-a-real-key'

describe('testDeepSeekApiKey', () => {
  it('refuses an empty draft without fetching', async () => {
    const fetchImpl = vi.fn()
    await expect(testDeepSeekApiKey('   ', fetchImpl)).resolves.toEqual({ kind: 'empty' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports ok, http, and cors without logging the key', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ok = vi.fn(async () => ({ ok: true, status: 200 }) as Response)
    await expect(testDeepSeekApiKey(FIXTURE, ok)).resolves.toEqual({ kind: 'ok' })
    expect(ok).toHaveBeenCalledWith(DEEPSEEK_MODELS_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${FIXTURE}` },
    })
    const http = vi.fn(async () => ({ ok: false, status: 401 }) as Response)
    await expect(testDeepSeekApiKey(FIXTURE, http)).resolves.toEqual({ kind: 'http', status: 401 })
    const cors = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await expect(testDeepSeekApiKey(FIXTURE, cors)).resolves.toEqual({ kind: 'cors' })
    for (const spy of [log, error, warn]) {
      expect(spy.mock.calls.flat().join(' ')).not.toContain(FIXTURE)
    }
  })
})

describe('credential constants', () => {
  it('names the write-only DeepSeek reference and official consoles', () => {
    expect(DEEPSEEK_API_KEY_REF).toBe('DEEPSEEK_API_KEY')
    expect(DEEPSEEK_DOCS_URL).toBe('https://api-docs.deepseek.com/zh-cn/')
    expect(DEEPSEEK_CONSOLE_URL).toBe('https://platform.deepseek.com/api_keys')
    expect(INITIAL_API_KEY_SHEET).toEqual({ open: false, configured: false, writable: true })
  })
})
