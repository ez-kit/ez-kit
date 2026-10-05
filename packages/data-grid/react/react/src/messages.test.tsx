import { createColumns, defaultMessages } from '@ez-kit/data-grid-core'
import { render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { DataGridOptionsProvider } from './data-grid-options-context'
import { TEST_FEATURES, testComponents } from './test-utils'
import { useDataGrid } from './use-data-grid'
import { useGridMessages } from './use-grid-messages'

import type { GridFeatures } from './types'
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
		const table = useDataGrid<GridFeatures, User>({
			features: TEST_FEATURES,
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

	it('words a drag announcement from the English dictionary', () => {
		// The announcement keys are whole sentences taking a named context, so a default is read by
		// calling it — there is no stem to assert on. Both axes, because a row is announced by its
		// position alone and a column by its name as well.
		expect(defaultMessages.ordering.rowPickedUp({ position: 3, total: 20 })).toBe('Picked up row 3 of 20.')
		expect(defaultMessages.ordering.columnDropped({ name: 'Price', position: 2, total: 9 })).toBe(
			'Dropped column Price at position 2 of 9.',
		)
	})

	it('replaces one announcement, keeping the drag handles’ own names', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				messages: {
					ordering: {
						rowPickedUp: ({ position, total }) => `Взяли строку ${String(position)} из ${String(total)}.`,
					},
				},
			}),
		)

		const { ordering } = result.current.grid.messages
		expect(ordering.rowPickedUp({ position: 1, total: 2 })).toBe('Взяли строку 1 из 2.')
		// The group's siblings survive — the handle name that shipped before the announcements, the
		// other sentences, and the two constants beside them.
		expect(ordering.dragRow).toBe(defaultMessages.ordering.dragRow)
		expect(ordering.rowDropped({ position: 1, total: 2 })).toBe(
			defaultMessages.ordering.rowDropped({ position: 1, total: 2 }),
		)
		expect(ordering.draggable).toBe(defaultMessages.ordering.draggable)
		expect(ordering.instructions).toBe(defaultMessages.ordering.instructions)
	})

	it('lets a grid override one `ordering` key of the provider’s dictionary, keeping the rest', () => {
		function Probe() {
			const messages = useGridMessages()
			return (
				<>
					<span data-testid='picked'>{messages.ordering.rowPickedUp({ position: 2, total: 7 })}</span>
					<span data-testid='roledescription'>{messages.ordering.draggable}</span>
				</>
			)
		}
		function Grid() {
			const table = useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				messages: { ordering: { rowPickedUp: ({ position }) => `Строка ${String(position)}.` } },
			})
			return <DataGrid table={table}>{<Probe />}</DataGrid>
		}

		render(
			<GridComponentsProvider components={testComponents}>
				<DataGridOptionsProvider
					defaults={{
						messages: {
							ordering: { rowPickedUp: () => 'не видно', draggable: 'перетаскиваемый' },
						},
					}}
				>
					<Grid />
				</DataGridOptionsProvider>
			</GridComponentsProvider>,
		)

		expect(screen.getByTestId('picked').textContent).toBe('Строка 2.')
		expect(screen.getByTestId('roledescription').textContent).toBe('перетаскиваемый')
	})

	it('resolves onto `table.grid.messages` complete, never partial', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
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
