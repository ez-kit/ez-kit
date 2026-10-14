import { createColumns } from '@ez-kit/data-grid-core'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { DataGrid } from '../data-grid/data-grid'
import { TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'
import { ActionBarVariant } from '../types'
import { useDataGrid } from '../use-data-grid'

import { BottomBarLayout } from './bottom-bar-layout'
import { DefaultLayout } from './default-layout'
import { FilterPanelLayout } from './filter-panel-layout'
import { PopoverFiltersLayout } from './popover-filters-layout'

import type { GridComponents } from '../contract'
import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ComponentType, ReactElement, ReactNode } from 'react'

/**
 * The layout presets, and the `core.Layout` slot they are bound to.
 *
 * Replaces `filter-panel-default-layout.test.tsx`, `footer-default-layout.test.tsx`'s layout half
 * and `global-filter-placement.test.tsx`, each of which tested one of the eight removed options
 * by the arrangement it produced. The arrangements survive; what produces them is a preset now,
 * so that is what is asserted.
 */

type Row = (typeof TEST_ROWS)[number]

const FILTERABLE = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
])

const PLACEHOLDER = 'Find rows'

const TOOLBAR = '[role="toolbar"]'
const BOTTOM_BAR = "[data-slot='bottom-bar']"
const FILTER_PANEL = '[data-slot="filter-panel-chrome"]'
const HEADER_FILTER = 'thead [data-slot="header-extras"]'
const POPOVER_TRIGGER = 'thead button[aria-label="Filter"]'
// Both kits stamp `data-slot='page-sizer'` on the control, but that slot belongs to the kit —
// this package hands `PageSizerProps` to whatever is registered, and the test double is a bare
// `<select>`. Addressed by its markup for the same reason `bottom-bar.test.tsx` does.
const SIZER = 'select'

/** The element, or a failure that names the selector rather than a `null` dereference later. */
function requireElement(container: HTMLElement, selector: string): HTMLElement {
	const element = container.querySelector<HTMLElement>(selector)
	if (!element) throw new Error(`expected the grid to render ${selector}`)
	return element
}

/**
 * Render a grid whose body comes from a **registered** `core.Layout`, which is how a UI kit
 * ships one. Deliberately not `children`: passing the preset as a child would exercise the same
 * JSX through a different path and say nothing about the slot.
 */
function renderLayout(
	Layout: ComponentType,
	config: Partial<UseDataGridConfig<GridFeatures, Row>> = {},
	children?: ReactNode,
	{ toolbarStart = false }: { toolbarStart?: boolean } = {},
) {
	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, Row>({
			features: TEST_FEATURES,
			data: TEST_ROWS,
			columns: TEST_COLUMNS,
			...config,
		})
		// `toolbarStart` stands in for a layout of the consumer's own that puts a sizer in the
		// toolbar — the recipe `DefaultLayout`'s docblock gives for the sizer it does not mount.
		const body = toolbarStart ? (
			<>
				<DataGrid.Toolbar start={<DataGrid.PageSizer />} />
				<DataGrid.Table />
			</>
		) : (
			children
		)
		return (
			<DataGrid<GridFeatures, Row>
				table={table}
				components={{ core: { Layout } }}
			>
				{body}
			</DataGrid>
		)
	}
	// A bare provider rather than the shared wrapper: `testComponents` registers `DefaultLayout`
	// for the rest of the suite, and every case here supplies its own.
	return render(
		<GridComponentsProvider components={testComponents}>
			<Harness />
		</GridComponentsProvider>,
	)
}

describe('the grid body: children ?? core.Layout ?? the table', () => {
	// The shared kit minus its `core.Layout`, which is the state the bare package is in: dropped
	// rather than set to `undefined`, which `exactOptionalPropertyTypes` does not accept.
	const { Layout: _boundLayout, ...coreWithoutLayout } = testComponents.core
	const withoutLayout = { ...testComponents, core: coreWithoutLayout }

	function renderBody(components: GridComponents, children?: ReactNode) {
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, Row>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				// On for every case, so "nothing but a table" is a claim about the body and not
				// about a grid that had nothing to render anyway.
				visibility: true,
				sorting: true,
				globalFiltering: true,
				pagination: { items: [5, 10] },
			})
			return (
				<DataGrid<GridFeatures, Row>
					table={table}
					components={components}
				>
					{children}
				</DataGrid>
			)
		}
		return render(
			<GridComponentsProvider components={withoutLayout}>
				<Harness />
			</GridComponentsProvider>,
		)
	}

	it('renders only the table when nothing registers a Layout', () => {
		const { container } = renderBody({})

		expect(container.querySelector('table')).not.toBeNull()
		expect(container.querySelector(TOOLBAR)).toBeNull()
		expect(container.querySelector(SIZER)).toBeNull()
		// The whole point of the fallback: the bare package ships no rich default and does not
		// import one, so a kit is what turns a grid into a shell.
		expect(container.textContent).not.toContain('»')
	})

	it('renders the registered Layout when there is one', () => {
		const { container } = renderBody({ core: { Layout: () => <p>my layout</p> } })

		expect(container.textContent).toContain('my layout')
		expect(container.querySelector('table')).toBeNull()
	})

	it('lets children beat both', () => {
		const { container } = renderBody({ core: { Layout: () => <p>my layout</p> } }, <p>my children</p>)

		expect(container.textContent).toContain('my children')
		expect(container.textContent).not.toContain('my layout')
	})
})

describe('DefaultLayout', () => {
	it('composes toolbar, table and pagination', () => {
		const { container } = renderLayout(DefaultLayout, {
			globalFiltering: { placeholder: PLACEHOLDER },
			visibility: true,
			pagination: { items: [5, 10] },
		})

		const toolbar = requireElement(container, TOOLBAR)
		expect(within(toolbar).getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
		expect(within(toolbar).getByText('Columns')).toBeInTheDocument()
		expect(container.querySelector('table')).not.toBeNull()
		expect(container.textContent).toContain('»')
		// The page sizer went to the toolbar under `pageSizer: 'toolbar'`; this preset carries none
		// at all, and `BottomBarLayout` is the one that does.
		expect(container.querySelector(BOTTOM_BAR)).toBeNull()
	})

	/**
	 * The cost of the preset split, made executable.
	 *
	 * `pagination.pageSizer` defaulted to "in the toolbar iff the author wrote `items`", and that
	 * gate read the **authored** config, which does not survive resolution — so `DefaultLayout`
	 * carries no sizer and `BottomBarLayout` is where one lives. That is a silent no-op for anyone
	 * who writes `items` and expects a selector, so it is asserted rather than left to the
	 * docblocks: a later "helpful" addition to `DefaultLayout` fails here instead of going quiet.
	 */
	it('mounts no page sizer, even when the grid resolves a size list', () => {
		const { container } = renderLayout(DefaultLayout, { pagination: { items: [5, 10] } })

		expect(container.querySelector(SIZER)).toBeNull()
		expect(container.querySelector(BOTTOM_BAR)).toBeNull()
		// The list itself still resolves — it is data, and a hand-placed sizer reads it.
		expect(container.textContent).toContain('»')
	})

	it('mounts one where a layout asks for it, in the toolbar', () => {
		// The documented recipe for the arrangement `pageSizer: 'toolbar'` used to name.
		const { container } = renderLayout(DefaultLayout, { pagination: { items: [5, 10] } }, undefined, {
			toolbarStart: true,
		})

		expect(requireElement(container, TOOLBAR).querySelector(SIZER)).not.toBeNull()
	})

	it('mounts no toolbar at all when no feature has a control for it', () => {
		const { container } = renderLayout(DefaultLayout)

		expect(container.querySelector(TOOLBAR)).toBeNull()
		expect(container.querySelector('table')).not.toBeNull()
	})

	// What `globalFiltering.toolbar: 'start'` was for: the search box leads, the rest follows.
	it('puts the search box before the trailing controls', () => {
		const { container } = renderLayout(DefaultLayout, {
			globalFiltering: { placeholder: PLACEHOLDER },
			visibility: true,
		})

		const toolbar = requireElement(container, TOOLBAR)
		const search = within(toolbar).getByPlaceholderText(PLACEHOLDER)
		const columns = within(toolbar).getByText('Columns')
		expect(search.compareDocumentPosition(columns) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
	})

	it('mounts the tfoot a column declared, because the table does', () => {
		const { container } = renderLayout(DefaultLayout, {
			columns: createColumns<Row>([
				{ accessorKey: 'name', header: 'Name', footer: 'Total' },
				{ accessorKey: 'age', header: 'Age' },
			]),
		})

		expect(container.querySelector('tfoot')).not.toBeNull()
	})
})

describe('BottomBarLayout', () => {
	// What `pagination: { pageSizer: 'footer' }` asked for — and the counterpart of
	// `DefaultLayout`'s "mounts no page sizer" case above: between them the two pin which preset
	// carries a sizer, so the split is a test rather than a comment.
	it('puts the page sizer beside the page controls', () => {
		const { container } = renderLayout(BottomBarLayout, { pagination: { items: [5, 10] } })

		const bar = requireElement(container, BOTTOM_BAR)
		expect(bar.querySelector(SIZER)).not.toBeNull()
		expect(bar.textContent).toContain('»')
	})
})

describe('FilterPanelLayout', () => {
	// What the five-option tablecn arrangement asked for, in one name.
	it('leads with search, then the filter panel, and trails the actions', () => {
		const { container } = renderLayout(FilterPanelLayout, {
			columns: FILTERABLE,
			filtering: true,
			globalFiltering: { placeholder: PLACEHOLDER },
			visibility: true,
			pagination: { items: [5, 10] },
		})

		const toolbar = requireElement(container, TOOLBAR)
		const search = within(toolbar).getByPlaceholderText(PLACEHOLDER)
		const panel = requireElement(toolbar, FILTER_PANEL)
		const columns = within(toolbar).getByText('Columns')

		expect(search.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
		expect(panel.compareDocumentPosition(columns) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
		expect(container.querySelector(BOTTOM_BAR)).not.toBeNull()
	})

	/**
	 * The arrangement no value of the removed `filtering.variant` could name: `'panel'` took the
	 * header controls away and `'inline'` mounted no panel, so "both" was inexpressible. It falls
	 * out of composition — and both controls drive one `columnFilters` entry, which is two inputs
	 * bound to one value.
	 */
	it('keeps the header filters beside the panel, both on one filter value', async () => {
		const { container } = renderLayout(FilterPanelLayout, { columns: FILTERABLE, filtering: true })

		const headerFilter = requireElement(container, `${HEADER_FILTER} input`)
		expect(container.querySelector(FILTER_PANEL)).not.toBeNull()

		await userEvent.type(headerFilter, 'Ali')

		// The panel's chip for the same column reports the value the header cell committed — one
		// `columnFilters` entry behind two controls.
		const chipValue = await screen.findByText(
			(_text, node) => node?.getAttribute('data-slot') === 'filter-panel-chip-value' && node.textContent === 'Ali',
		)
		expect(chipValue.closest("[data-slot='filter-panel-chip']")).toHaveAttribute('data-has-value', 'true')
	})
})

describe('PopoverFiltersLayout', () => {
	// What `filtering: { variant: 'popover' }` asked for — an expansion down to `HeaderCell`,
	// which is the cost this preset exists to absorb.
	it('puts each column filter behind a header popover instead of inline', () => {
		const { container } = renderLayout(PopoverFiltersLayout, { columns: FILTERABLE, filtering: true })

		expect(container.querySelectorAll(POPOVER_TRIGGER).length).toBe(FILTERABLE.length)
		expect(container.querySelector(HEADER_FILTER)).toBeNull()
	})

	it('still renders the rows and the pagination', () => {
		const { container } = renderLayout(PopoverFiltersLayout, {
			columns: FILTERABLE,
			filtering: true,
			pagination: { items: [5, 10] },
		})

		expect(container.querySelectorAll('tbody tr').length).toBe(TEST_ROWS.length)
		expect(container.textContent).toContain('»')
	})
})

describe('the built-in header cell', () => {
	// The `variant !== 'panel'` term used to force `filter` to `null` for every caller, so a
	// render function had no control to place even when it wanted one.
	it('renders the inline filter whenever the column is genuinely filterable', () => {
		const { container } = renderLayout(DefaultLayout, { columns: FILTERABLE, filtering: true })

		expect(container.querySelectorAll(HEADER_FILTER).length).toBe(FILTERABLE.length)
	})

	it('renders no filter for a grid that does not filter', () => {
		const { container } = renderLayout(DefaultLayout, { columns: FILTERABLE })

		expect(container.querySelector(HEADER_FILTER)).toBeNull()
	})
})

/**
 * The action bar: exactly one of it, placed by the bar's own variant.
 *
 * `inline` is a strip in the flow beside the rows it acts on, so every preset puts it between the
 * toolbar and the table — and in `FilterPanelLayout` after the chips, which belong to the toolbar
 * that writes them. `floating` overlays the rows, so it stays last. A layout of one's own still
 * puts it wherever it writes it: the variant decides nothing there.
 */
describe('the action bar', () => {
	const ACTION_BAR = "[data-slot='action-bar']"
	// The test double for the bar is a `role='toolbar'` too; the grid's toolbar is the one without
	// a slot.
	const GRID_TOOLBAR = '[role="toolbar"]:not([data-slot])'
	const TABLE_WRAPPER = "[data-slot='table-wrapper']"
	const ACTIVE_FILTERS = "[data-slot='active-filters-bar']"

	const PRESETS: [string, ComponentType][] = [
		['DefaultLayout', DefaultLayout],
		['BottomBarLayout', BottomBarLayout],
		['FilterPanelLayout', FilterPanelLayout],
		['PopoverFiltersLayout', PopoverFiltersLayout],
	]

	type Bar = NonNullable<UseDataGridConfig<GridFeatures, Row>['selection']>

	function selectedConfig(selection: Bar): Partial<UseDataGridConfig<GridFeatures, Row>> {
		return {
			selection,
			// Toolbar renders null without content — `creating` gives it the "+ Add" trigger, so
			// there is a toolbar to be after.
			creating: { onSave: () => Promise.resolve() },
			initialState: { rowSelection: { '1': true } },
		}
	}

	/** Asserts the elements appear in the DOM in the order given, none nested in another. */
	function expectInOrder(...elements: HTMLElement[]) {
		elements.slice(1).forEach((element, index) => {
			const position = elements[index]?.compareDocumentPosition(element) ?? 0
			expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
			expect(position & Node.DOCUMENT_POSITION_CONTAINED_BY).toBeFalsy()
		})
	}

	it.each(PRESETS)('%s puts an inline bar between the toolbar and the table', (_name, Layout) => {
		const { container } = renderLayout(Layout, selectedConfig({ bar: ActionBarVariant.Inline }))

		expect(container.querySelectorAll(ACTION_BAR)).toHaveLength(1)
		expectInOrder(
			requireElement(container, GRID_TOOLBAR),
			requireElement(container, ACTION_BAR),
			requireElement(container, TABLE_WRAPPER),
		)
	})

	it('puts an inline bar after the active-filters strip in FilterPanelLayout', () => {
		const { container } = renderLayout(FilterPanelLayout, {
			...selectedConfig({ bar: ActionBarVariant.Inline }),
			columns: FILTERABLE,
			filtering: true,
			initialState: { rowSelection: { '1': true }, columnFilters: [{ id: 'name', value: 'Ali' }] },
		})

		expectInOrder(
			requireElement(container, GRID_TOOLBAR),
			requireElement(container, ACTIVE_FILTERS),
			requireElement(container, ACTION_BAR),
			requireElement(container, TABLE_WRAPPER),
		)
	})

	const BOTTOM_CASES: [string, ComponentType, Bar][] = PRESETS.flatMap(([name, Layout]) => [
		[`${name}, default`, Layout, true],
		[`${name}, floating`, Layout, { bar: ActionBarVariant.Floating }],
	])

	it.each(BOTTOM_CASES)('%s: renders one bar, after the table', (_name, Layout, selection) => {
		const { container } = renderLayout(Layout, selectedConfig(selection))

		expect(container.querySelectorAll(ACTION_BAR)).toHaveLength(1)
		expectInOrder(requireElement(container, TABLE_WRAPPER), requireElement(container, ACTION_BAR))
	})

	/**
	 * A controlled `selection.bar` can flip at runtime. The bar moves rather than remounting —
	 * one keyed element in either slot — and the selection, which lives in the table's store,
	 * is untouched either way.
	 */
	it.each(PRESETS)('%s moves the bar when the variant changes at runtime', (_name, Layout) => {
		function Harness({ variant }: { variant: ActionBarVariant }): ReactElement {
			const table = useDataGrid<GridFeatures, Row>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				...selectedConfig({ bar: variant }),
			})
			return (
				<DataGrid<GridFeatures, Row>
					table={table}
					components={{ core: { Layout } }}
				/>
			)
		}
		const ui = (variant: ActionBarVariant) => (
			<GridComponentsProvider components={testComponents}>
				<Harness variant={variant} />
			</GridComponentsProvider>
		)

		const { container, rerender } = render(ui(ActionBarVariant.Floating))
		const floatingBar = requireElement(container, ACTION_BAR)
		expectInOrder(requireElement(container, TABLE_WRAPPER), floatingBar)

		rerender(ui(ActionBarVariant.Inline))
		const inlineBar = requireElement(container, ACTION_BAR)
		expect(container.querySelectorAll(ACTION_BAR)).toHaveLength(1)
		expectInOrder(inlineBar, requireElement(container, TABLE_WRAPPER))
		expect(inlineBar).toBe(floatingBar)
		expect(inlineBar).toHaveAttribute('data-selected-count', '1')

		rerender(ui(ActionBarVariant.Floating))
		expect(container.querySelectorAll(ACTION_BAR)).toHaveLength(1)
		expectInOrder(requireElement(container, TABLE_WRAPPER), requireElement(container, ACTION_BAR))
		expect(requireElement(container, ACTION_BAR)).toHaveAttribute('data-selected-count', '1')
	})

	it('leaves the bar where a layout of its own writes it, whatever the variant', () => {
		const { container } = renderLayout(
			DefaultLayout,
			selectedConfig({ bar: ActionBarVariant.Inline }),
			<>
				<DataGrid.Toolbar />
				<DataGrid.Table />
				<DataGrid.ActionBar />
			</>,
		)

		expect(container.querySelectorAll(ACTION_BAR)).toHaveLength(1)
		expectInOrder(requireElement(container, TABLE_WRAPPER), requireElement(container, ACTION_BAR))
	})
})

/**
 * Which controls a preset mounts, as one rule: a feature's control goes in only when the grid has
 * no other way into — or back out of — that feature.
 *
 * Search, the column-visibility toggle and "+ Add" pass it: each is the only surface its feature
 * has, and a hidden column has no way back without the toggle. The sort builder and clear-filters
 * fail it — sorting already has the header click, and every filter clears in its own input. Both
 * were opt-in before the placement options were removed (`sorting.toolbar`, `filtering.toolbar`),
 * and the presets turned them on by gating everything on "the feature is on". Asserted here so a
 * later addition to `useToolbarEnd` has to argue with the rule rather than slip past it.
 */
describe('toolbar controls the presets mount', () => {
	const SORT_BUILDER = 'sort builder'
	const CLEAR_FILTERS = "[data-slot='clear-filter-button']"

	const withSortMarker: GridComponents = {
		...testComponents,
		sorting: { ...testComponents.sorting, SortMenu: () => <span>{SORT_BUILDER}</span> },
	}

	function renderPreset(Layout: ComponentType) {
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, Row>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: FILTERABLE,
				sorting: true,
				filtering: true,
				visibility: true,
				initialState: { columnFilters: [{ id: 'name', value: 'a' }] },
			})
			return (
				<DataGrid<GridFeatures, Row>
					table={table}
					components={{ core: { Layout } }}
				/>
			)
		}
		return render(
			<GridComponentsProvider components={withSortMarker}>
				<Harness />
			</GridComponentsProvider>,
		)
	}

	it.each([
		['DefaultLayout', DefaultLayout],
		['BottomBarLayout', BottomBarLayout],
		['FilterPanelLayout', FilterPanelLayout],
		['PopoverFiltersLayout', PopoverFiltersLayout],
	])('%s mounts neither the sort builder nor clear-filters', (_name, Layout) => {
		const { container } = renderPreset(Layout)

		const toolbar = requireElement(container, TOOLBAR)
		expect(within(toolbar).getByText('Columns')).toBeInTheDocument()
		expect(screen.queryByText(SORT_BUILDER)).toBeNull()
		expect(toolbar.querySelector(CLEAR_FILTERS)).toBeNull()
	})

	it('mounts both where a layout writes them', () => {
		function SortAndClearLayout() {
			return (
				<>
					<DataGrid.Toolbar
						end={
							<>
								<DataGrid.ClearFiltersButton />
								<DataGrid.SortMenuTrigger />
							</>
						}
					/>
					<DataGrid.Table />
				</>
			)
		}

		const { container } = renderPreset(SortAndClearLayout)

		const toolbar = requireElement(container, TOOLBAR)
		expect(within(toolbar).getByText(SORT_BUILDER)).toBeInTheDocument()
		expect(toolbar.querySelector(CLEAR_FILTERS)).not.toBeNull()
	})
})
