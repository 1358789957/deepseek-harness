/**
 * Browser-side DeepSeek key probe. The official credentials store is
 * write-only, so a test can only send a key the user just typed. Never log
 * the key or put it in a thrown message.
 */

/** Credential reference written by the plus-menu API key sheet. */
export const DEEPSEEK_API_KEY_REF = 'DEEPSEEK_API_KEY'

/** Public models endpoint used by the 测试 action. */
export const DEEPSEEK_MODELS_URL = 'https://api.deepseek.com/models'

/** Official API docs (Chinese). */
export const DEEPSEEK_DOCS_URL = 'https://api-docs.deepseek.com/zh-cn/'

/** Official console where the user creates and verifies keys. */
export const DEEPSEEK_CONSOLE_URL = 'https://platform.deepseek.com/api_keys'

/** Outcome of one models-list probe. */
export type DeepSeekKeyTestResult =
  | { kind: 'ok' }
  | { kind: 'http'; status: number }
  | { kind: 'cors' }
  | { kind: 'empty' }

/**
 * GET the public models list with a Bearer key.
 * @param key - typed key; never a stored secret.
 * @param fetchImpl - `fetch` or a test double.
 * @returns ok / http status / empty / cors-or-network collapse.
 */
export async function testDeepSeekApiKey(
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeepSeekKeyTestResult> {
  const trimmed = key.trim()
  if (trimmed === '') return { kind: 'empty' }
  try {
    const response = await fetchImpl(DEEPSEEK_MODELS_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${trimmed}` },
    })
    return response.ok ? { kind: 'ok' } : { kind: 'http', status: response.status }
  } catch {
    // Browser CORS and network failures look the same from fetch; the UI
    // points at the console because this probe cannot distinguish them.
    return { kind: 'cors' }
  }
}
