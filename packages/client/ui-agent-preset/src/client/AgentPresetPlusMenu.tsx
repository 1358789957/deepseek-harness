/**
 * Plus-menu agent-mode rows: the four built-in presets plus any user ones.
 */
import { useEffect } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AgentPresetSeatState } from './seat-store.ts'
import { presetDisplayText } from './locales.ts'
import css from './AgentPresetPlusMenu.module.css'

/** Same seat face as the hero chip — one roster, one staged pick. */
export interface AgentPresetPlusInjected {
  hooks: {
    /** Seat snapshot bound as useAgentPresetSeat. */
    agentPresetSeat: SnapshotStore<AgentPresetSeatState>
  }
  /** Read the roster when the menu first renders. */
  load: () => Promise<void>
  /** Stage one preset for the next session. */
  select: (id: string) => Promise<void>
}

/** Full props of the plus-menu mode list. */
export type AgentPresetPlusMenuProps =
  PropsRuntime<'conversation.input.plus'>
  & PropsLocale<'settings.agentPreset'>
  & InjectFace<AgentPresetPlusInjected>

const PLUS_MODE_IDS = ['standard', 'code', 'minimal', 'cordis'] as const

/**
 * Render the four agent-mode rows.
 * @param props - plus-menu owner share and the seat controller.
 * @returns the mode group.
 */
export function AgentPresetPlusMenu({
  onClose, load, select, useAgentPresetSeat, t,
}: AgentPresetPlusMenuProps) {
  const state = useAgentPresetSeat(snapshot => snapshot)

  useEffect(() => {
    void load()
  }, [load])

  const modes = PLUS_MODE_IDS
    .map(id => state.options.find(option => option.id === id))
    .filter((option): option is NonNullable<typeof option> => option !== undefined)
  const rows = modes.length > 0 ? modes : state.options.slice(0, 4)

  return (
    <div className={css.group}>
      {rows.map((option) => {
        const text = presetDisplayText(option, t)
        const current = option.id === state.current
        return (
          <button
            key={option.id}
            type="button"
            role="menuitem"
            className={current ? `${css.row} ${css.current}` : css.row}
            aria-current={current ? 'true' : undefined}
            disabled={state.busy}
            onClick={() => {
              void select(option.id).then(() => { onClose() })
            }}
          >
            {text.name}
          </button>
        )
      })}
    </div>
  )
}
