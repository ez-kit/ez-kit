import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../react-columns'
import { TEST_FEATURES, renderWithComponents } from '../test-utils'

import { useDataGridCell, useDataGridHeaderCell, useDataGridRow } from './composition-context'
import { DataGrid } from './data-grid'

import type { DataGridCellRenderArgs, DataGridHeaderCellRenderArgs, DataGridRowRenderArgs } from '../index'

type User = { id: number; name: string; age: number }

const DATA: User[] = [
	{ id: 1, name: 'Ada', age: 36 },
	{ id: 2, name: 'Grace', age: 45 },
]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

/** A header cell body as a component — the thing a render function could not be. */
function HeaderCellBody() {
	const { sortTrigger, menu } = useDataGridHeaderCell<User>()
	return (
		<DataGrid.HeaderMain>
			{sortTrigger}
			{menu}
		</DataGrid.HeaderMain>
	)
}

describe('useDataGridHeaderCell', () => {
	it('hands a prop-less component the same parts the render function receives', () => {
		// Erased, because the call site below does not write `<DataGrid.HeaderCell<User>>` — the
		// hook takes the row type as a parameter instead, which is the point of the comparison.
		let fromRenderArgs: DataGridHeaderCellRenderArgs | undefined
		// Captured through a spy rather than by assigning an outer binding, which
		// `react-hooks/globals` forbids inside a component.
		const captureHook = vi.fn<(args: DataGridHeaderCellRenderArgs<User>) => void>()

		function Probe() {
			captureHook(useDataGridHeaderCell<User>())
			return null
		}

		renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting
			>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<DataGrid.HeaderRow
									key={group.id}
									headerGroup={group}
								>
									{({ headers }) =>
										headers.map((header) => (
											<DataGrid.HeaderCell
												key={header.id}
												header={header}
											>
												{(args) => {
													if (header.column.id === 'name') fromRenderArgs = args
													return <Probe />
												}}
											</DataGrid.HeaderCell>
										))
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)

		// The *same object*, not an equivalent one: the component builds it once and both
		// publishes and passes it, which is what keeps the two composition styles from drifting.
		const fromHook = captureHook.mock.calls.at(-1)?.[0]
		expect(fromHook).toBeDefined()
		expect(fromRenderArgs).toBeDefined()
		expect(fromHook?.header.column.id).toBe('age')
		expect(fromRenderArgs?.header.column.id).toBe('name')
		expect(fromRenderArgs?.canSort).toBe(true)
	})

	it('renders a header composed from a prop-less body component', () => {
		const { container, getByText } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
				sorting
			>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<DataGrid.HeaderRow
									key={group.id}
									headerGroup={group}
								>
									{({ headers }) =>
										headers.map((header) => (
											<DataGrid.HeaderCell
												key={header.id}
												header={header}
											>
												<HeaderCellBody />
											</DataGrid.HeaderCell>
										))
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(getByText('Name')).toBeTruthy()
		expect(container.querySelectorAll("[data-slot='header-main']").length).toBe(2)
		expect(container.querySelectorAll("[data-slot='sort-trigger']").length).toBe(2)
	})

	it('throws outside a header cell, naming the component to render inside', () => {
		function Stray() {
			useDataGridHeaderCell()
			return null
		}
		expect(() => {
			renderWithComponents(
				<DataGrid
					features={TEST_FEATURES}
					data={DATA}
					columns={COLUMNS}
				>
					<Stray />
				</DataGrid>,
			)
		}).toThrow('useDataGridHeaderCell() must be called inside <DataGrid.HeaderCell>.')
	})
})

describe('useDataGridRow', () => {
	it('gives a static child the default cells the row would have rendered', () => {
		function RowBody() {
			const { row, content } = useDataGridRow<User>()
			return (
				<>
					{content}
					<td data-slot='td'>note for {row.original.name}</td>
				</>
			)
		}

		const { getByText, container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
			>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									<RowBody />
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(getByText('note for Ada')).toBeTruthy()
		// Two data columns plus the appended cell, per row.
		expect(container.querySelectorAll("tbody tr:first-child [data-slot='td']").length).toBe(3)
		expect(getByText('Ada')).toBeTruthy()
	})

	it('does not build the default cells when nothing reads `content`', () => {
		const countCell = vi.fn()
		function CountingCell() {
			countCell()
			return null
		}
		function RowBody() {
			// Reads the row, never `content` — the skip the static-children branch always had.
			const { row } = useDataGridRow<User>()
			return <td data-slot='td'>only {row.original.name}</td>
		}

		renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={createColumns<User>([{ accessorKey: 'name', header: 'Name', cell: { component: CountingCell } }])}
			>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									<RowBody />
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(countCell).not.toHaveBeenCalled()
	})

	it('throws outside a row', () => {
		function Stray() {
			useDataGridRow()
			return null
		}
		expect(() => {
			renderWithComponents(
				<DataGrid
					features={TEST_FEATURES}
					data={DATA}
					columns={COLUMNS}
				>
					<Stray />
				</DataGrid>,
			)
		}).toThrow('useDataGridRow() must be called inside <DataGrid.Row>.')
	})
})

describe('useDataGridCell', () => {
	it('wraps the default cell content without reimplementing it', () => {
		const captureCell = vi.fn<(args: DataGridCellRenderArgs<User>) => void>()
		function CellBody() {
			const args = useDataGridCell<User>()
			captureCell(args)
			return <span data-testid='wrapped'>[{args.content}]</span>
		}

		const { container } = renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
			>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									{({ cells }) =>
										cells.map((cell) => (
											<DataGrid.Cell
												key={cell.id}
												cell={cell}
												row={row}
											>
												<CellBody />
											</DataGrid.Cell>
										))
									}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(container.querySelectorAll('[data-testid="wrapped"]').length).toBe(4)
		expect(container.textContent).toContain('[Ada]')
		expect(captureCell.mock.calls.at(-1)?.[0].value).toBe(45)
	})

	it('throws outside a cell', () => {
		function Stray() {
			useDataGridCell()
			return null
		}
		expect(() => {
			renderWithComponents(
				<DataGrid
					features={TEST_FEATURES}
					data={DATA}
					columns={COLUMNS}
				>
					<Stray />
				</DataGrid>,
			)
		}).toThrow('useDataGridCell() must be called inside <DataGrid.Cell>.')
	})
})

describe('render props still work unchanged', () => {
	it('a render function receives the object the context publishes', () => {
		const seen: DataGridRowRenderArgs[] = []
		renderWithComponents(
			<DataGrid
				features={TEST_FEATURES}
				data={DATA}
				columns={COLUMNS}
			>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									{(args) => {
										seen.push(args)
										return args.content
									}}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(seen.length).toBe(2)
		expect(seen[0]?.cells.length).toBe(2)
	})
})
