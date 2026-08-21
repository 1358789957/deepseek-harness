/**
 * Settings panel face behind ctx.settingsPanel: open/close the shell modal
 * and optionally select a section. Viewing state lives in the snapshot store
 * assembled in apply; this class is the write face other plugins call.
 */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** Viewing state of the settings modal. */
export interface SettingsPanelState {
  /** Whether the modal is open. */
  open: boolean
  /** Selected section id; absent means the first visible row. */
  sectionId?: string
}

/**
 * The outward settings-panel face (`ctx.settingsPanel`). Plugins open a
 * named section without rendering the shell themselves.
 */
export interface ISettingsPanel {
  /**
   * Open the settings modal.
   * @param sectionId - optional `settings.section` id to select.
   */
  open(sectionId?: string): void
  /** Close the modal and clear the selected section. */
  close(): void
}

/** Cross-plugin settings-panel face (ctx.settingsPanel). */
export class SettingsPanelController implements ISettingsPanel {
  /**
   * @param store - the shell's open/section snapshot.
   */
  constructor(private readonly store: SnapshotStore<SettingsPanelState>) {}

  /**
   * Open the settings modal.
   * @param sectionId - optional `settings.section` id to select.
   */
  open(sectionId?: string): void {
    const current = this.store.getSnapshot()
    this.store.set({
      open: true,
      ...sectionId === undefined
        ? current.sectionId === undefined ? {} : { sectionId: current.sectionId }
        : { sectionId },
    })
  }

  /** Close the modal and clear the selected section. */
  close(): void {
    this.store.set({ open: false })
  }
}
