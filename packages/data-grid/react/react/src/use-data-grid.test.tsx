import { defineColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SELECTION_BAR_KEY, VIRTUALIZED_KEY, useDataGrid } from './use-data-grid'

interface User {
  id: number
  name: string
}

const USERS: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]
const COLUMNS = defineColumns<User>([{ accessorKey: 'name' }])

describe('useDataGrid', () => {
  it('creates a table instance with initial data', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS }),
    )
    expect(result.current.getRowModel().rows).toHaveLength(2)
  })

  it('instance is stable across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS }),
    )
    const instance1 = result.current
    rerender()
    expect(result.current).toBe(instance1)
  })

  it('updates data when config.data changes', () => {
    const newData = [{ id: 3, name: 'Carol' }]
    const { result, rerender } = renderHook(
      ({ data }: { data: User[] }) =>
        useDataGrid({ data, columns: COLUMNS }),
      { initialProps: { data: USERS } },
    )
    rerender({ data: newData })
    expect(result.current.getRowModel().rows).toHaveLength(1)
    expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
  })

  it('re-renders when table state changes', () => {
    const { result } = renderHook(() =>
      useDataGrid({
        data: USERS,
        columns: COLUMNS,
        creating: { onSave: () => true },
      }),
    )
    expect(result.current.getCreatingState().isCreating).toBe(false)
    act(() => {
      result.current.startCreating()
    })
    expect(result.current.getCreatingState().isCreating).toBe(true)
  })

  it('syncs loading state', () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) =>
        useDataGrid({ data: USERS, columns: COLUMNS, loading }),
      { initialProps: { loading: false } },
    )
    expect(result.current.getIsLoading()).toBe(false)
    rerender({ loading: true })
    expect(result.current.getIsLoading()).toBe(true)
  })
})

describe('useDataGrid — virtualized', () => {
  it('VIRTUALIZED_KEY is undefined when virtualized not set', () => {
    const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
    const key = (result.current as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
    expect(key).toBeUndefined()
  })

  it('VIRTUALIZED_KEY stores normalized config when virtualized: true', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, virtualized: true }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
    expect(key).toEqual({ row: {} })
  })

  it('VIRTUALIZED_KEY stores normalized config when virtualized: { row: true }', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, virtualized: { row: true } }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
    expect(key).toEqual({ row: {} })
  })

  it('VIRTUALIZED_KEY stores RowVirtualOptions when provided', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, virtualized: { row: { overscan: 8 } } }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
    expect(key).toEqual({ row: { overscan: 8 } })
  })

  it('VIRTUALIZED_KEY is undefined when virtualized: false', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, virtualized: false }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
    expect(key).toBeUndefined()
  })
})

describe('useDataGrid — selectionBar', () => {
  it('SELECTION_BAR_KEY is undefined when selectionBar not set', () => {
    const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
    const key = (result.current as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
    expect(key).toBeUndefined()
  })

  it('SELECTION_BAR_KEY stores true when selectionBar: true', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: true }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
    expect(key).toBe(true)
  })

  it('SELECTION_BAR_KEY stores false when selectionBar: false', () => {
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: false }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
    expect(key).toBe(false)
  })

  it('SELECTION_BAR_KEY stores config object when selectionBar: { onDelete }', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() =>
      useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: { onDelete } }),
    )
    const key = (result.current as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
    expect(key).toEqual({ onDelete })
  })
})
