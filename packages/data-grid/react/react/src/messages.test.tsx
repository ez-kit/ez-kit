import { createColumns, defaultMessages } from '@ez-kit/data-grid-core'
import { render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { DataGridOptionsProvider } from './data-grid-options-context'
import { testComponents } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { PartialGridMessages } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function renderGrid(messages: PartialGridMessages | undefined, wrapper?: (children: ReactNode) => ReactNode) {
	function Grid() {
		const table = useDataGrid<User>({
			data: USERS,
			columns: COLUMNS,
			selection: true,
			...(messages !== undefined ? { messages } : {}),
		})
		return <DataGrid table={table} />
	}
	const tree = (
		<GridComponentsProvider components={testComponents}>
			<Grid />
		</GridComponentsProvider>
	)
	return render(wrapper ? <>{wrapper(tree)}</> : tree)
}

describe('messages', () => {
	it('renders the English dictionary when the grid names none', () => {
		renderGrid(undefined)

		expect(screen.getAllByLabelText(defaultMessages.selection.selectRow).length).toBe(USERS.length)
	})

	it('replaces a string named on the grid', () => {
		renderGrid({ selection: { selectRow: 'Выбрать строку' } })

		expect(screen.getAllByLabelText('Выбрать строку').length).toBe(USERS.length)
		// The group's other entries survive the override.
		expect(screen.getByLabelText(defaultMessages.selection.selectAll)).toBeTruthy()
	})

	it('takes an app-wide dictionary from the provider', () => {
		renderGrid(undefined, (children) => (
			<DataGridOptionsProvider defaults={{ messages: { selection: { selectRow: 'Выбрать строку' } } }}>
				{children}
			</DataGridOptionsProvider>
		))

		expect(screen.getAllByLabelText('Выбрать строку').length).toBe(USERS.length)
	})

	it('lets the grid override one string of the provider’s dictionary, keeping the rest', () => {
		renderGrid({ selection: { selectRow: 'Отметить строку' } }, (children) => (
			<DataGridOptionsProvider
				defaults={{ messages: { selection: { selectRow: 'Выбрать строку', selectAll: 'Выбрать все' } } }}
			>
				{children}
			</DataGridOptionsProvider>
		))

		expect(screen.getAllByLabelText('Отметить строку').length).toBe(USERS.length)
		expect(screen.getByLabelText('Выбрать все')).toBeTruthy()
	})

	it('resolves onto `table.grid.messages` complete, never partial', () => {
		const { result } = renderHook(() =>
			useDataGrid<User>({
				data: USERS,
				columns: COLUMNS,
				messages: { pagination: { rowsPerPage: 'Строк на странице' } },
			}),
		)

		expect(result.current.grid.messages.pagination.rowsPerPage).toBe('Строк на странице')
		expect(result.current.grid.messages.pagination.next).toBe(defaultMessages.pagination.next)
		expect(result.current.grid.messages.fallbacks.empty).toBe(defaultMessages.fallbacks.empty)
	})
})
