import { describe, expect, it } from 'vitest'

import { createTable, defineColumns } from './index'

interface User {
  id: number
  name: string
  age: number
}

const USERS: User[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]

describe('@ez-kit/data-grid-core', () => {
  it('exports createTable and defineColumns', () => {
    expect(createTable).toBeTypeOf('function')
    expect(defineColumns).toBeTypeOf('function')
  })

  it('createTable returns a table with rows', () => {
    const table = createTable({
      data: USERS,
      columns: defineColumns<User>([
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'age', header: 'Age' },
      ]),
    })
    expect(table.getRowModel().rows).toHaveLength(2)
  })

  it('setData updates the rows', () => {
    const table = createTable({
      data: USERS,
      columns: defineColumns<User>([{ accessorKey: 'name' }]),
    })
    table.setData([{ id: 3, name: 'Carol', age: 28 }])
    expect(table.getRowModel().rows).toHaveLength(1)
    expect(table.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
  })

  it('subscribe/getSnapshot fire on state change', () => {
    const table = createTable({
      data: USERS,
      columns: defineColumns<User>([{ accessorKey: 'name' }]),
      creating: { onSave: () => true },
    })
    const snap1 = table.getSnapshot()
    let fired = false
    table.subscribe(() => {
      fired = true
    })
    table.startCreating()
    expect(fired).toBe(true)
    expect(table.getSnapshot()).not.toBe(snap1)
  })
})
