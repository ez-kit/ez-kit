import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../react-columns'
import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; age: number }

const DATA: User[] = [{ id: 1, name: 'Ada', age: 36 }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', headerClassName: 'th-name' },
	{ accessorKey: 'age', header: 'Age' },
])

describe('DataGrid.HeaderRow / DataGrid.HeaderCell', () => {
	it('a custom cell for one column leaves the others on the default', () => {
		const { container, getByText } = renderWithComponents(
			<DataGrid
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
										headers.map((header) =>
											header.column.id === 'age' ? (
												<DataGrid.HeaderCell
													key={header.id}
													header={header}
												>
													custom age
												</DataGrid.HeaderCell>
											) : (
												<DataGrid.HeaderCell
													key={header.id}
													header={header}
												/>
											),
										)
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)

		expect(getByText('custom age')).toBeDefined()
		// The untouched column keeps its default cell — sort affordance and class included.
		const nameTh = container.querySelector('[data-column-id="name"]')
		expect(nameTh?.className).toContain('th-name')
		expect(nameTh?.querySelector('[data-slot="sort-trigger"]')).not.toBeNull()
		// The custom cell keeps its `<th>` shell.
		const ageTh = container.querySelector('[data-column-id="age"]')
		expect(ageTh?.getAttribute('data-slot')).toBe('th')
	})

	it('hands the default parts to a render function so they can be reused', () => {
		const { container } = renderWithComponents(
			<DataGrid
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
												{({ label, sortTrigger, canSort }) => (
													<div data-testid={`hdr-${header.column.id}`}>
														<span data-testid='raw-label'>{label}</span>
														{canSort ? sortTrigger : null}
													</div>
												)}
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

		// `label` is the bare content, `sortTrigger` the wired affordance — both available.
		expect(container.querySelectorAll('[data-testid="raw-label"]')).toHaveLength(2)
		expect(container.querySelectorAll('[data-slot="sort-trigger"]')).toHaveLength(2)
	})
})

describe('sort affordance vs. interactive header content', () => {
	// `column.header` renders inside the sort affordance, because clicking a column's name to
	// sort it is how every table works. That used to make a button placed there fire the sort
	// too — the click bubbled straight into the handler.
	it('a button inside column.header does not also sort', () => {
		const onClick = vi.fn()
		const onSortChange = vi.fn()
		const columns = createColumns<User>([
			{
				accessorKey: 'name',
				header: () => (
					<button
						data-testid='hdr-btn'
						onClick={onClick}
					>
						pick
					</button>
				),
			},
		])

		const { getByTestId } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={columns}
				sorting={{ onChange: onSortChange }}
			/>,
		)

		fireEvent.click(getByTestId('hdr-btn'))
		expect(onClick).toHaveBeenCalledTimes(1)
		expect(onSortChange).not.toHaveBeenCalled()
	})

	it('clicking the column name still sorts', () => {
		const onSortChange = vi.fn()
		const { getByText } = renderWithComponents(
			<DataGrid
				data={DATA}
				columns={COLUMNS}
				sorting={{ onChange: onSortChange }}
			/>,
		)

		fireEvent.click(getByText('Name'))
		expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
	})
})
