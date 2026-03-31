import { defineColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDataGrid } from './use-data-grid'

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
