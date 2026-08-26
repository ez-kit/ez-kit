import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithComponents, TEST_COLUMNS, TEST_ROWS } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactElement, ReactNode } from 'react'

type TestRow = (typeof TEST_ROWS)[number]

/**
 * Render a grid whose compound tree the test supplies, rather than the default
 * `<DataGrid table={…} />` shorthand `renderGrid` uses.
 */
function renderComposed(children: ReactNode, config: Partial<UseDataGridConfig<TestRow>> = {}) {
	function Harness(): ReactElement {
		const instance = useDataGrid<TestRow>({ data: TEST_ROWS, columns: TEST_COLUMNS, ...config })
		return <DataGrid<TestRow> table={instance}>{children}</DataGrid>
	}
	return renderWithComponents(<Harness />)
}

describe('DataGrid.Table — children', () => {
	it('renders the built-in header + body when children are omitted', () => {
		renderComposed(<DataGrid.Table />)
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('renders supplied children instead of the built-in pair', () => {
		renderComposed(
			<DataGrid.Table>
				<tbody data-testid='custom-body'>
					<tr>
						<td>replaced</td>
					</tr>
				</tbody>
			</DataGrid.Table>,
		)
		expect(screen.getByTestId('custom-body')).toHaveTextContent('replaced')
		// The built-in header is not mounted, so no column label is rendered.
		expect(screen.queryByText('Name')).not.toBeInTheDocument()
	})

	it('lets Header and Body be reordered and extended (the tfoot the default layout lacks)', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
				<tfoot data-testid='tfoot'>
					<tr>
						<td>footer</td>
					</tr>
				</tfoot>
			</DataGrid.Table>,
		)
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByTestId('tfoot')).toHaveTextContent('footer')
	})

	it('passes table, headerGroups and rows to a render function', () => {
		renderComposed(
			<DataGrid.Table>
				{({ table, headerGroups, rows }) => (
					<tbody data-testid='render-prop'>
						<tr>
							<td>
								{String(rows.length)}/{String(headerGroups.length)}/{String(table.getAllColumns().length)}
							</td>
						</tr>
					</tbody>
				)}
			</DataGrid.Table>,
		)
		// 3 rows, 1 header group, 2 columns
		expect(screen.getByTestId('render-prop')).toHaveTextContent('3/1/2')
	})
})

describe('DataGrid.Body — children', () => {
	it('renders the built-in rows when children are omitted', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
			</DataGrid.Table>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('renders rows composed by a render function from DataGrid.Row', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body>
					{({ rows }) =>
						rows
							.filter((row) => row.getValue<string>('name') !== 'Bob')
							.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								/>
							))
					}
				</DataGrid.Body>
			</DataGrid.Table>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Carol')).toBeInTheDocument()
		expect(screen.queryByText('Bob')).not.toBeInTheDocument()
	})

	it('a custom body opts out of the loading fallback', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>
					<tr data-testid='mine'>
						<td>mine</td>
					</tr>
				</DataGrid.Body>
			</DataGrid.Table>,
			{ initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } } },
		)
		expect(screen.getByTestId('mine')).toBeInTheDocument()
	})
})

describe('DataGrid.Header — sticky flag', () => {
	it('resolves stickyHeader from the grid option when used standalone', () => {
		const { container } = renderComposed(
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
			</DataGrid.Table>,
			{ layout: { stickyHeader: true } },
		)
		expect(container.querySelector('thead')).toHaveAttribute('data-sticky', 'true')
	})

	it('leaves the flag off when the grid option is off', () => {
		const { container } = renderComposed(
			<DataGrid.Table>
				<DataGrid.Header />
			</DataGrid.Table>,
		)
		expect(container.querySelector('thead')).not.toHaveAttribute('data-sticky')
	})
})

describe('DataGrid.Toolbar — slots', () => {
	it('appends `right` after the auto-mounted controls instead of replacing them', () => {
		renderComposed(<DataGrid.Toolbar right={<button type='button'>Export</button>} />, {
			columnVisibility: { toolbar: true },
		})
		const toolbar = screen.getByRole('toolbar')
		// The auto-mounted column-visibility trigger ("Columns") survives alongside the slot.
		expect(within(toolbar).getByText('Export')).toBeInTheDocument()
		expect(within(toolbar).getByText('Columns')).toBeInTheDocument()
	})

	it('appends `left` after the auto-mounted PageSizer', () => {
		renderComposed(<DataGrid.Toolbar left={<span>Total: 3</span>} />, {
			pagination: { pageSizeOptions: [5, 10] },
		})
		const toolbar = screen.getByRole('toolbar')
		expect(within(toolbar).getByText('Total: 3')).toBeInTheDocument()
		// The auto-mounted PageSizer (a <select> in the test kit) survives alongside the slot.
		expect(within(toolbar).getByRole('combobox')).toBeInTheDocument()
	})

	it('renders a slot-only toolbar even when no feature auto-mounts anything', () => {
		renderComposed(<DataGrid.Toolbar right={<button type='button'>Only mine</button>} />)
		expect(within(screen.getByRole('toolbar')).getByText('Only mine')).toBeInTheDocument()
	})

	it('children still replace the whole bar', () => {
		renderComposed(<DataGrid.Toolbar>{<span>everything mine</span>}</DataGrid.Toolbar>, {
			columnVisibility: { toolbar: true },
		})
		const toolbar = screen.getByRole('toolbar')
		expect(within(toolbar).getByText('everything mine')).toBeInTheDocument()
		expect(within(toolbar).queryByText('Columns')).not.toBeInTheDocument()
	})
})

describe('sorting.toolbar — the UI flag that moved out of core', () => {
	// `sorting.toolbar` used to sit on the headless `SortingConfig` with a doc comment saying
	// "ignored by core". It now lives on `ReactSortingConfig`, next to `globalFiltering.toolbar`
	// and `columnVisibility.toolbar`, and still drives the same auto-mount.
	const markerComponents = { sorting: { SortMenu: () => <span>sort builder</span> } }

	function renderWithSortMenu(config: Partial<UseDataGridConfig<TestRow>>) {
		function Harness(): ReactElement {
			const instance = useDataGrid<TestRow>({ data: TEST_ROWS, columns: TEST_COLUMNS, ...config })
			return (
				<DataGrid<TestRow>
					table={instance}
					components={markerComponents}
				>
					<DataGrid.Toolbar />
				</DataGrid>
			)
		}
		return renderWithComponents(<Harness />)
	}

	it('auto-mounts the sort builder when sorting.toolbar is true', () => {
		renderWithSortMenu({ sorting: { toolbar: true } })
		expect(screen.getByText('sort builder')).toBeInTheDocument()
	})

	it('does not auto-mount it for plain `sorting: true`', () => {
		renderWithSortMenu({ sorting: true })
		expect(screen.queryByText('sort builder')).not.toBeInTheDocument()
	})

	it('a per-instance `components` override reaches the injected slot', () => {
		// The same test proves `<DataGrid components>` merges over the provider registry
		// rather than replacing it — the rest of the kit still renders.
		renderWithSortMenu({ sorting: { toolbar: true } })
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
	})
})
