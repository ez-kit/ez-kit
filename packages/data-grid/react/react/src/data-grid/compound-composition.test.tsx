import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES, renderWithComponents, TEST_COLUMNS, TEST_ROWS } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactElement, ReactNode } from 'react'

type TestRow = (typeof TEST_ROWS)[number]

/**
 * Render a grid whose compound tree the test supplies, rather than the default
 * `<DataGrid table={…} />` shorthand `renderGrid` uses.
 */
function renderComposed(children: ReactNode, config: Partial<UseDataGridConfig<GridFeatures, TestRow>> = {}) {
	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, TestRow>({
			features: TEST_FEATURES,
			data: TEST_ROWS,
			columns: TEST_COLUMNS,
			...config,
		})
		return <DataGrid<GridFeatures, TestRow> table={table}>{children}</DataGrid>
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

	/**
	 * The loading skeleton, both empty states and the virtualized body each render a `<tbody>` of
	 * their own, so none of them can be handed to `children` as content. They are therefore
	 * checked *before* a custom body rather than after it.
	 *
	 * This inverts what the grid used to do. Supplying `children` silently switched all four off,
	 * which was survivable while a custom body was a rare, deliberate act and stopped being so
	 * once `content` made "keep the built-in body and add a row" the recommended shape. The
	 * capability is not lost — it moved to the switch that already existed.
	 */
	const PENDING = { loading: { isPending: true, isFetching: false, isError: false, error: null } }

	it('shows the loading fallback rather than the custom body', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>
					<tr data-testid='mine'>
						<td>mine</td>
					</tr>
				</DataGrid.Body>
			</DataGrid.Table>,
			{ initialState: PENDING },
		)

		expect(screen.queryByTestId('mine')).not.toBeInTheDocument()
		expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
	})

	it('hands the body back once the fallback is turned off where it is configured', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>
					<tr data-testid='mine'>
						<td>mine</td>
					</tr>
				</DataGrid.Body>
			</DataGrid.Table>,
			{ initialState: PENDING, fallbacks: { loading: false } },
		)

		expect(screen.getByTestId('mine')).toBeInTheDocument()
		expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
	})

	// Virtualization is the one branch with no opt-out: it positions rows itself, so it owns the
	// body, and a custom one cannot be merged into it. Ignoring it silently is the failure this
	// whole reordering exists to remove, so it is the one case that warns.
	it('warns and keeps the virtualized body when a virtualized grid is given children', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			renderComposed(
				<DataGrid.Table>
					<DataGrid.Body>
						<tr data-testid='mine'>
							<td>mine</td>
						</tr>
					</DataGrid.Body>
				</DataGrid.Table>,
				{ virtualization: true },
			)

			expect(screen.queryByTestId('mine')).not.toBeInTheDocument()
			expect(error).toHaveBeenCalledWith(expect.stringContaining('virtualized grid'))
		} finally {
			error.mockRestore()
		}
	})

	it('renders the custom body once the grid has rows again', () => {
		renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>
					<tr data-testid='mine'>
						<td>mine</td>
					</tr>
				</DataGrid.Body>
			</DataGrid.Table>,
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
		renderComposed(<DataGrid.Toolbar end={<button type='button'>Export</button>} />, {
			visibility: { toolbar: true },
		})
		const toolbar = screen.getByRole('toolbar')
		// The auto-mounted column-visibility trigger ("Columns") survives alongside the slot.
		expect(within(toolbar).getByText('Export')).toBeInTheDocument()
		expect(within(toolbar).getByText('Columns')).toBeInTheDocument()
	})

	it('appends `left` after the auto-mounted PageSizer', () => {
		renderComposed(<DataGrid.Toolbar start={<span>Total: 3</span>} />, {
			pagination: { items: [5, 10] },
		})
		const toolbar = screen.getByRole('toolbar')
		expect(within(toolbar).getByText('Total: 3')).toBeInTheDocument()
		// The auto-mounted PageSizer (a <select> in the test kit) survives alongside the slot.
		expect(within(toolbar).getByRole('combobox')).toBeInTheDocument()
	})

	it('renders a slot-only toolbar even when no feature auto-mounts anything', () => {
		renderComposed(<DataGrid.Toolbar end={<button type='button'>Only mine</button>} />)
		expect(within(screen.getByRole('toolbar')).getByText('Only mine')).toBeInTheDocument()
	})

	it("hands the caller's className to the kit, with and without children", () => {
		// The react package authors no class; it passes one through so a kit can merge it — which is
		// what a toolbar re-used as a card's header bar needs (the kits ship `mb-2` on the bar).
		const { unmount } = renderComposed(
			<DataGrid.Toolbar
				className='mine'
				end={<span>slot</span>}
			/>,
		)
		expect(screen.getByRole('toolbar')).toHaveClass('mine')
		unmount()

		renderComposed(<DataGrid.Toolbar className='mine'>{<span>everything mine</span>}</DataGrid.Toolbar>)
		expect(screen.getByRole('toolbar')).toHaveClass('mine')
	})

	it('children still replace the whole bar', () => {
		renderComposed(<DataGrid.Toolbar>{<span>everything mine</span>}</DataGrid.Toolbar>, {
			visibility: { toolbar: true },
		})
		const toolbar = screen.getByRole('toolbar')
		expect(within(toolbar).getByText('everything mine')).toBeInTheDocument()
		expect(within(toolbar).queryByText('Columns')).not.toBeInTheDocument()
	})
})

describe('sorting.toolbar — the UI flag that moved out of core', () => {
	// `sorting.toolbar` used to sit on the headless `SortingConfig` with a doc comment saying
	// "ignored by core". It now lives on `ReactSortingConfig`, next to `globalFiltering.toolbar`
	// and `visibility.toolbar`, and still drives the same auto-mount.
	const markerComponents = { sorting: { SortMenu: () => <span>sort builder</span> } }

	function renderWithSortMenu(config: Partial<UseDataGridConfig<GridFeatures, TestRow>>) {
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				...config,
			})
			return (
				<DataGrid<GridFeatures, TestRow>
					table={table}
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

	it('a per-table `components` override reaches the injected slot', () => {
		// The same test proves `<DataGrid components>` merges over the provider registry
		// rather than replacing it — the rest of the kit still renders.
		renderWithSortMenu({ sorting: { toolbar: true } })
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
	})
})

/**
 * Owning the `<tbody>` used to mean giving up everything the built-in body puts in it. The parts
 * are handed back now, so a custom body adds rather than replaces.
 */
describe('DataGrid.Body — content', () => {
	const rowCount = (container: HTMLElement) => container.querySelectorAll('[data-slot="tr"][data-row-id]').length

	it('composes to the same rows the built-in body renders', () => {
		const builtIn = renderComposed(
			<DataGrid.Table>
				<DataGrid.Body />
			</DataGrid.Table>,
		)
		const expected = rowCount(builtIn.container)
		expect(expected).toBeGreaterThan(0)
		builtIn.unmount()

		const composed = renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>{({ content }) => content}</DataGrid.Body>
			</DataGrid.Table>,
		)
		expect(rowCount(composed.container)).toBe(expected)
	})

	it('keeps the rows while the body adds to them', () => {
		const { container } = renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>
					{({ content }) => (
						<>
							{content}
							<tr
								data-slot='tr'
								data-testid='summary'
							>
								<td>Σ</td>
							</tr>
						</>
					)}
				</DataGrid.Body>
			</DataGrid.Table>,
		)

		expect(rowCount(container)).toBe(TEST_ROWS.length)
		expect(screen.getByTestId('summary')).toBeInTheDocument()
	})

	it('hands the parts over one at a time', () => {
		const { container } = renderComposed(
			<DataGrid.Table>
				<DataGrid.Body>
					{({ creatingRow, centerRows, pinnedTopRows, pinnedBottomRows }) => {
						// Nothing is creating and nothing is pinned, so those three are empty and the
						// centre carries the whole model.
						expect(creatingRow).toBeNull()
						expect(pinnedTopRows).toHaveLength(0)
						expect(pinnedBottomRows).toHaveLength(0)
						return centerRows
					}}
				</DataGrid.Body>
			</DataGrid.Table>,
		)

		expect(rowCount(container)).toBe(TEST_ROWS.length)
	})
})
