import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PAGE_SIZER_KEY } from '../use-data-grid'

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

  it('renders custom cell.component output', () => {
    const cols = defineColumns<User>([
      { accessorKey: 'name', header: 'Name', cell: { component: ({ value }) => <span data-testid='custom-cell'>{String(value)}</span> } },
      { accessorKey: 'age', header: 'Age' },
    ])
    const table = createTable<User>({ data: USERS, columns: cols })
    render(<DataGrid table={table} />)
    expect(screen.getAllByTestId('custom-cell')).toHaveLength(USERS.length)
  })

  it('renders ✓ for true and ✗ for false with boolean cell type', () => {
    interface BoolRow { id: number; active: boolean }
    const boolCols = defineColumns<BoolRow>([
      { accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
    ])
    const boolData: BoolRow[] = [
      { id: 1, active: true },
      { id: 2, active: false },
    ]
    const table = createTable<BoolRow>({ data: boolData, columns: boolCols })
    render(<DataGrid table={table} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('uses registry view component for custom cell type', () => {
    const cols = defineColumns<User>([
      { accessorKey: 'age', header: 'Age', cell: { type: 'money' } },
    ])
    const table = createTable<User>({ data: USERS, columns: cols })
    render(
      <DataGrid
        table={table}
        cellTypes={{
          money: {
            view: ({ value }) => <span data-testid='money-cell'>€{String(value)}</span>,
          },
        }}
      />,
    )
    expect(screen.getAllByTestId('money-cell')).toHaveLength(USERS.length)
  })

  it('does not render PageSizer when pageSizer config is not set', () => {
    const table = makeTable({ pagination: { pageSize: 5 } })
    render(<DataGrid table={table} />)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('renders PageSizer select with items when pageSizer config is set', () => {
    const table = makeTable({ pagination: { pageSize: 5 } })
    ;(table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] = { items: [5, 10, 25] }
    render(<DataGrid table={table} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('5')
    expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '25' })).toBeInTheDocument()
  })

  it('registry creating falls back to edit component when creating not provided', () => {
    const editFn = vi.fn(() => <input data-testid='registry-edit' />)
    const cols = defineColumns<User>([
      { accessorKey: 'name', header: 'Name', cell: { type: 'custom-type' } },
      { accessorKey: 'age', header: 'Age' },
    ])
    const table = createTable<User>({
      data: USERS,
      columns: cols,
      creating: { mode: 'row', onSave: () => true },
    })
    const { rerender } = render(
      <DataGrid
        table={table}
        cellTypes={{ 'custom-type': { edit: editFn } }}
      />,
    )
    act(() => { table.startCreating() })
    rerender(
      <DataGrid
        table={table}
        cellTypes={{ 'custom-type': { edit: editFn } }}
      />,
    )
    expect(screen.getAllByTestId('registry-edit').length).toBeGreaterThan(0)
  })
})
