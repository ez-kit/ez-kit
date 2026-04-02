import { describe, expect, it, vi } from 'vitest'

import { defineColumns } from '../column/define-columns'
import { createTable } from '../create-table'

interface Row {
  id: number
  name: string
}

const DATA: Row[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = defineColumns<Row>([{ accessorKey: 'name' }])

describe('CreatingFeature', () => {
  it('initial state: not creating', () => {
    const table = createTable({
      data: DATA,
      columns: COLUMNS,
      creating: { onSave: () => true },
    })
    expect(table.getCreatingState().isCreating).toBe(false)
    expect(table.getCreatingState().creatingValues).toEqual({})
  })

  it('startCreating sets isCreating = true', () => {
    const table = createTable({
      data: DATA,
      columns: COLUMNS,
      creating: { onSave: () => true },
    })
    table.startCreating()
    expect(table.getCreatingState().isCreating).toBe(true)
  })

  it('cancelCreating resets state', () => {
    const table = createTable({
      data: DATA,
      columns: COLUMNS,
      creating: { onSave: () => true },
    })
    table.startCreating()
    table.setCreatingValue('name', 'Bob')
    table.cancelCreating()
    expect(table.getCreatingState().isCreating).toBe(false)
    expect(table.getCreatingState().creatingValues).toEqual({})
  })

  it('setCreatingValue updates values', () => {
    const table = createTable({
      data: DATA,
      columns: COLUMNS,
      creating: { onSave: () => true },
    })
    table.startCreating()
    table.setCreatingValue('name', 'Carol')
    expect(table.getCreatingState().creatingValues.name).toBe('Carol')
  })

  it('commitCreating calls onSave with values and resets on true', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const table = createTable({
      data: DATA,
      columns: COLUMNS,
      creating: { onSave },
    })
    table.startCreating()
    table.setCreatingValue('name', 'Dave')
    await table.commitCreating()
    expect(onSave).toHaveBeenCalledWith({ name: 'Dave' })
    expect(table.getCreatingState().isCreating).toBe(false)
  })

  it('commitCreating keeps form open when onSave returns false', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    const table = createTable({
      data: DATA,
      columns: COLUMNS,
      creating: { onSave },
    })
    table.startCreating()
    await table.commitCreating()
    expect(table.getCreatingState().isCreating).toBe(true)
  })

  it('commitCreating does nothing when creating config is absent', async () => {
    const table = createTable({ data: DATA, columns: COLUMNS })
    await expect(table.commitCreating()).resolves.toBeUndefined()
  })
})
