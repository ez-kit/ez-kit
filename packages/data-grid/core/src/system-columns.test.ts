import { describe, expect, it } from 'vitest'

import { buildColumnList, extractPinningState, ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

import type { TanStackColumnDef } from './column/types'

interface Row { id: number; name: string }

const USER_COL: TanStackColumnDef<Row> = { id: 'name', header: 'Name', meta: {} }

describe('buildColumnList', () => {
  it('returns only user columns when no system columns needed', () => {
    const cols = buildColumnList([USER_COL], {
      selection: false,
      expanding: false,
      editing: false,
      deleting: false,
      pinning: false,
    })
    expect(cols).toHaveLength(1)
    expect(cols[0]?.id).toBe('name')
  })

  it('prepends __selection__ when selection is true', () => {
    const cols = buildColumnList([USER_COL], {
      selection: true,
      expanding: false,
      editing: false,
      deleting: false,
      pinning: false,
    })
    expect(cols[0]?.id).toBe(SELECTION_COLUMN_ID)
    expect(cols[1]?.id).toBe('name')
  })

  it('prepends __expand__ after __selection__', () => {
    const cols = buildColumnList([USER_COL], {
      selection: true,
      expanding: true,
      editing: false,
      deleting: false,
      pinning: false,
    })
    expect(cols[0]?.id).toBe(SELECTION_COLUMN_ID)
    expect(cols[1]?.id).toBe(EXPAND_COLUMN_ID)
    expect(cols[2]?.id).toBe('name')
  })

  it('appends __actions__ when editing or deleting', () => {
    const cols = buildColumnList([USER_COL], {
      selection: false,
      expanding: false,
      editing: true,
      deleting: false,
      pinning: false,
    })
    expect(cols[cols.length - 1]?.id).toBe(ACTIONS_COLUMN_ID)
  })

  it('actions column has columnPinning: { pin: "right" } in meta', () => {
    const cols = buildColumnList([USER_COL], {
      selection: false,
      expanding: false,
      editing: false,
      deleting: true,
      pinning: false,
    })
    const actions = cols.find((c) => c.id === ACTIONS_COLUMN_ID)
    expect(actions?.meta?.columnPinning).toEqual({ pin: 'right' })
  })

  it('full order: [selection, expand, user..., actions]', () => {
    const cols = buildColumnList([USER_COL], {
      selection: true,
      expanding: true,
      editing: true,
      deleting: true,
      pinning: false,
    })
    const ids = cols.map((c) => c.id)
    expect(ids).toEqual([SELECTION_COLUMN_ID, EXPAND_COLUMN_ID, 'name', ACTIONS_COLUMN_ID])
  })
})

describe('extractPinningState', () => {
  it('extracts columns with static pin position', () => {
    const cols: TanStackColumnDef<Row>[] = [
      { id: 'a', meta: { columnPinning: { pin: 'left' } } },
      { id: 'b', meta: { columnPinning: { pin: 'right' } } },
      { id: 'c', meta: {} },
    ]
    const { left, right } = extractPinningState(cols)
    expect(left).toContain('a')
    expect(right).toContain('b')
    expect(left).not.toContain('c')
  })

  it('extracts columns with defaultPin position', () => {
    const cols: TanStackColumnDef<Row>[] = [
      { id: 'd', meta: { columnPinning: { defaultPin: 'left' } } },
      { id: 'e', meta: { columnPinning: { defaultPin: 'right' } } },
    ]
    const { left, right } = extractPinningState(cols)
    expect(left).toContain('d')
    expect(right).toContain('e')
  })

  it('skips columns with columnPinning: false', () => {
    const cols: TanStackColumnDef<Row>[] = [
      { id: 'f', meta: { columnPinning: false } },
    ]
    const { left, right } = extractPinningState(cols)
    expect(left).not.toContain('f')
    expect(right).not.toContain('f')
  })
})
