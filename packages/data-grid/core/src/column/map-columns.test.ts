import { describe, expect, it, vi } from 'vitest'

import { mapColumns } from './map-columns'

import type { ColumnDef } from './types'

interface Row { id: number; name: string; age: number }

describe('mapColumns', () => {
  it('maps accessorKey to TanStack column', () => {
    const result = mapColumns<Row>([{ accessorKey: 'name', header: 'Name' }])
    expect(result).toHaveLength(1)
    if (!result[0]) throw new Error('expected column')
    const col = result[0]
    expect((col as { accessorKey?: string }).accessorKey).toBe('name')
    expect(col.header).toBe('Name')
  })

  it('sorting: false → enableSorting: false', () => {
    const result = mapColumns<Row>([{ accessorKey: 'name', sorting: false }])
    expect(result[0]?.enableSorting).toBe(false)
  })

  it('pin goes into meta.pin', () => {
    const result = mapColumns<Row>([{ accessorKey: 'name', pin: 'left' }])
    expect(result[0]?.meta?.pin).toBe('left')
  })

  it('filtering goes into meta.filtering', () => {
    const result = mapColumns<Row>([
      { accessorKey: 'name', filtering: { input: 'custom' } },
    ])
    expect(result[0]?.meta?.filtering).toEqual({ input: 'custom' })
  })

  it('filtering: false goes into meta', () => {
    const result = mapColumns<Row>([{ accessorKey: 'name', filtering: false }])
    expect(result[0]?.meta?.filtering).toBe(false)
  })

  it('cell.type goes into meta.cellType', () => {
    const result = mapColumns<Row>([
      { accessorKey: 'age', cell: { type: 'number' } },
    ])
    expect(result[0]?.meta?.cellType).toBe('number')
  })

  it('cell.view maps to TanStack cell renderer', () => {
    const view = vi.fn().mockReturnValue('rendered')
    const result = mapColumns<Row>([
      { accessorKey: 'name', cell: { view } },
    ])
    const cellFn = result[0]?.cell
    expect(cellFn).toBeTypeOf('function')
  })

  it('maps nested column groups', () => {
    const defs: ColumnDef<Row>[] = [
      {
        header: 'Group',
        columns: [
          { accessorKey: 'name' },
          { accessorKey: 'age' },
        ],
      },
    ]
    const result = mapColumns(defs)
    expect((result[0] as { columns?: unknown[] }).columns).toHaveLength(2)
  })
})
