// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { SkillPlusItem, type SkillPlusItemProps } from '../src/client/SkillPlusItem.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t: SkillPlusItemProps['t'] = makeTranslate(zh)

describe('SkillPlusItem', () => {
  it('closes the plus menu then opens the skill page', () => {
    const onClose = vi.fn()
    const openSkills = vi.fn()
    render(<SkillPlusItem {...{ onClose, openSkills, t } as unknown as SkillPlusItemProps} />)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Skill' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(openSkills).toHaveBeenCalledOnce()
    expect(onClose.mock.invocationCallOrder[0]!).toBeLessThan(openSkills.mock.invocationCallOrder[0]!)
  })
})
