/**
 * Viewing state for the plus-menu API-key sheet. The secret never lives here.
 */

/** Write-only key sheet: open bit plus describe() badges. */
export interface ApiKeySheetState {
  /** Whether the sheet is visible. */
  open: boolean
  /** Whether credentials.describe reports DEEPSEEK_API_KEY configured. */
  configured: boolean
  /** Whether credentials.set / unset can write this reference. */
  writable: boolean
}

/** Initial sheet state: closed, unknown until describe() returns. */
export const INITIAL_API_KEY_SHEET: ApiKeySheetState = {
  open: false,
  configured: false,
  writable: true,
}
