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
    const component = vi.fn()
    const result = mapColumns<Row>([
      { accessorKey: 'name', filtering: { component } },
    ])
    expect(result[0]?.meta?.filtering).toEqual({ component })
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

  it('cell.component maps to TanStack cell renderer and meta.cellView', () => {
    const component = vi.fn().mockReturnValue('custom')
    const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
    expect(result[0]?.cell).toBeTypeOf('function')
    expect(result[0]?.meta?.cellView).toBeTypeOf('function')
  })

  it('cell.component invoked as TanStack cell renderer', () => {
    const component = vi.fn().mockReturnValue('component-result')
    const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
    interface CellCtx { row: { original: Row; index: number }; getValue: () => unknown }
    const ctx: CellCtx = { row: { original: { id: 1, name: 'x', age: 0 }, index: 0 }, getValue: () => 'x' }
    const cellFn = result[0]?.cell as ((c: CellCtx) => unknown) | undefined
    cellFn?.(ctx)
    expect(component).toHaveBeenCalled()
  })

  it('filtering.component stored in meta.filtering', () => {
    const component = vi.fn()
    const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { component } }])
    expect((result[0]?.meta?.filtering as { component?: unknown } | undefined)?.component).toBe(component)
  })

  it('editing.component stored in meta.editing', () => {
    const component = vi.fn()
    const result = mapColumns<Row>([{ accessorKey: 'name', editing: { component } }])
    expect((result[0]?.meta?.editing as { component?: unknown } | undefined)?.component).toBe(component)
  })

  it('creating.component stored in meta.creating', () => {
    const component = vi.fn()
    const result = mapColumns<Row>([{ accessorKey: 'name', creating: { component } }])
    expect((result[0]?.meta?.creating as { component?: unknown } | undefined)?.component).toBe(component)
  })

  it('passes size, minSize, maxSize to TanStack column', () => {
    const result = mapColumns<Row>([
      { accessorKey: 'name', size: 200, minSize: 50, maxSize: 500 },
    ])
    expect(result[0]?.size).toBe(200)
    expect(result[0]?.minSize).toBe(50)
    expect(result[0]?.maxSize).toBe(500)
  })

  it('passes enableResizing: false to TanStack column', () => {
    const result = mapColumns<Row>([{ accessorKey: 'name', enableResizing: false }])
    expect(result[0]?.enableResizing).toBe(false)
  })
})
