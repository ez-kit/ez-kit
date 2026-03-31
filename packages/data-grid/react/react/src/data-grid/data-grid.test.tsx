import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DataGrid } from './data-grid'

interface User {
  id: number
  name: string
  age: number
}

const USERS: User[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]
const COLUMNS = defineColumns<User>([
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
])

function makeTable(config?: Partial<Parameters<typeof createTable<User>>[0]>) {
  return createTable<User>({ data: USERS, columns: COLUMNS, ...config })
}

describe('<DataGrid>', () => {
  it('renders table with rows', () => {
    const table = makeTable()
    render(<DataGrid table={table} />)
    expect(screen.getAllByRole('row')).toHaveLength(USERS.length + 1) // 1 header row + data rows
  })

  it('renders column headers', () => {
    const table = makeTable()
    render(<DataGrid table={table} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
  })

  it('renders cell values', () => {
    const table = makeTable()
    render(<DataGrid table={table} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders selection checkboxes when selection is enabled', () => {
    const table = makeTable({ selection: true })
    render(<DataGrid table={table} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(USERS.length)
  })

  it('renders "+ Add" button when creating is enabled', () => {
    const table = makeTable({ creating: { onSave: () => true } })
    render(<DataGrid table={table} />)
    expect(screen.getByText('+ Add')).toBeInTheDocument()
  })

  it('shows creating row inputs when startCreating is called', () => {
    const table = makeTable({ creating: { mode: 'row', onSave: () => true } })
    const { rerender } = render(<DataGrid table={table} />)
    // Before startCreating there should be no inputs
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    act(() => { table.startCreating() })
    rerender(<DataGrid table={table} />)
    // After startCreating, input cells should appear for each non-system column
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
  })

  it('renders Edit button in row editing mode', () => {
    const table = makeTable({ editing: { mode: 'row', onSave: () => true } })
    render(<DataGrid table={table} />)
    expect(screen.getAllByText('Edit')).toHaveLength(USERS.length)
  })

  it('renders Delete button when deleting is enabled', () => {
    const table = makeTable({ deleting: { onDelete: vi.fn() } })
    render(<DataGrid table={table} />)
    expect(screen.getAllByText('Delete')).toHaveLength(USERS.length)
  })

  it('calls onDelete when Delete is clicked', async () => {
    const onDelete = vi.fn()
    const table = makeTable({ deleting: { onDelete } })
    render(<DataGrid table={table} />)
    const deleteButtons = screen.getAllByText('Delete')
    if (!deleteButtons[0]) throw new Error('expected Delete button')
    await userEvent.click(deleteButtons[0])
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('renders compound children when provided', () => {
    const table = makeTable()
    render(
      <DataGrid table={table}>
        <span data-testid="custom-child">custom</span>
      </DataGrid>,
    )
    expect(screen.getByTestId('custom-child')).toBeInTheDocument()
  })

  it('compound pattern renders sub-components correctly', () => {
    const table = makeTable({ pagination: true })
    render(
      <DataGrid table={table}>
        <DataGrid.Table />
        <DataGrid.Pagination />
      </DataGrid>,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
