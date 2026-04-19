import { describe, expect, it } from 'vitest'
import { validateColumnLayout } from './boardRules'
import type { Column } from './types'

const preset = (overrides: Partial<Column>[] = []): Column[] => {
  const base: Column[] = [
    { columnId: 'c1', label: 'Todo', role: 'backlog' },
    { columnId: 'c2', label: 'Working', role: 'in_progress' },
    { columnId: 'c3', label: 'Done', role: 'done' },
  ]
  return base.map((c, i) => ({ ...c, ...overrides[i] }))
}

describe('validateColumnLayout', () => {
  it('accepts standard Todo / Working / Done', () => {
    expect(validateColumnLayout(preset())).toEqual({ ok: true })
  })

  it('fails when fewer than 3 columns (P02)', () => {
    const r = validateColumnLayout(preset().slice(0, 2))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/três colunas/i)
  })

  it('fails with zero in_progress (P01)', () => {
    const cols = preset()
    cols[1] = { ...cols[1]!, role: 'backlog' }
    const r = validateColumnLayout(cols)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Em progresso/i)
  })

  it('fails with two in_progress (P01)', () => {
    const cols = preset()
    cols[0] = { ...cols[0]!, role: 'in_progress' }
    const r = validateColumnLayout(cols)
    expect(r.ok).toBe(false)
  })
})
