import { createTable, defineColumns } from '@ez-kit/data-grid-react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ColumnVisibilityMenu } from './blocks/ColumnVisibilityMenu'
import { PageSizer } from './blocks/PageSizer'

import {
	CellTypesProvider,
	cellTypes,
	DataGrid,
	GridComponentsProvider,
	useDataGrid,
} from './index'

type User = {
	id: number
	name: string
}

describe('@ez-kit/data-grid-heroui', () => {
	it('exports the public DataGrid bundle', () => {
		expect(DataGrid).toBeTypeOf('function')
		expect(GridComponentsProvider).toBeTypeOf('function')
		expect(useDataGrid).toBeTypeOf('function')
		expect(CellTypesProvider).toBeTypeOf('function')
		expect(cellTypes.select).toBeDefined()
		expect(cellTypes.badge).toBeDefined()
		expect(cellTypes.image).toBeDefined()
		expect(cellTypes.link).toBeDefined()
		expect(cellTypes.progress).toBeDefined()
	})

	it('renders a simple DataGrid', () => {
		const table = createTable<User>({
			data: [{ id: 1, name: 'Ada' }],
			columns: defineColumns<User>([{ accessorKey: 'name', header: 'Name' }]),
		})

		render(<DataGrid table={table} />)

		expect(screen.getByRole('grid', { name: 'Data grid' })).toBeInTheDocument()
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Ada')).toBeInTheDocument()
	})

	it('selects rows through the grid checkbox', () => {
		const table = createTable<User>({
			data: [{ id: 1, name: 'Ada' }],
			columns: defineColumns<User>([{ accessorKey: 'name', header: 'Name' }]),
			selection: true,
		})

		render(<DataGrid table={table} />)

		const checkbox = screen.getByRole('checkbox', { name: 'Select row' })
		fireEvent.click(checkbox)

		expect(table.getIsAllRowsSelected()).toBe(true)
	})

	it('passes numeric page sizes from PageSizer', () => {
		const onPageSizeChange = vi.fn()

		render(
			<PageSizer
				pageSize={10}
				items={[10, 25]}
				onPageSizeChange={onPageSizeChange}
			/>,
		)

		fireEvent.click(screen.getByRole('button'))
		fireEvent.click(screen.getByRole('option', { name: '25' }))

		expect(onPageSizeChange).toHaveBeenCalledWith(25)
	})

	it('toggles column visibility items', () => {
		const onToggle = vi.fn()

		render(<ColumnVisibilityMenu columns={[{ id: 'name', label: 'Name', isVisible: true, onToggle }]} />)

		const [columnsButton] = screen.getAllByRole('button', { name: /columns/i })
		if (!columnsButton) throw new Error('expected columns button')
		fireEvent.click(columnsButton)
		fireEvent.click(screen.getByRole('option', { name: 'Name' }))

		expect(onToggle).toHaveBeenCalledTimes(1)
	})
})
