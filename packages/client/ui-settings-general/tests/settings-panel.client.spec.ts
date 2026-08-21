import { describe, expect, it } from 'vitest'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { SettingsPanelController } from '../src/client/service.ts'

describe('SettingsPanelController', () => {
  it('opens without a section, keeps the last section, then selects one', () => {
    const store = createSnapshotStore<{ open: boolean; sectionId?: string }>({ open: false })
    const panel = new SettingsPanelController(store)
    panel.open()
    expect(store.getSnapshot()).toEqual({ open: true })
    panel.open('plugins')
    expect(store.getSnapshot()).toEqual({ open: true, sectionId: 'plugins' })
    panel.open()
    expect(store.getSnapshot()).toEqual({ open: true, sectionId: 'plugins' })
  })

  it('closes by replacing the snapshot so the section id is cleared', () => {
    const store = createSnapshotStore<{ open: boolean; sectionId?: string }>({
      open: true, sectionId: 'models',
    })
    const panel = new SettingsPanelController(store)
    panel.close()
    expect(store.getSnapshot()).toEqual({ open: false })
  })
})
