import { ROW_TYPE_ARGS, TypeModule, type TypeRef } from './type-resolver'

/**
 * The explicit page → type map behind `docs-option-names.test.ts`.
 *
 * Every entry is hand-written on purpose. Nothing here is inferred by crawling
 * the docs tree: an unmapped page is *visibly* absent rather than silently
 * skipped, which is the only way coverage stays an honest number.
 *
 * Scope: the 19 data-grid pages whose option tables were hand-verified against
 * the real types in the #171-#174 audit slices, plus `state-model.mdx`, which
 * was written against those types from the start, plus the five pages added in
 * the follow-up audit (`columns/resizing.mdx`, `virtualization.mdx`,
 * `pagination/infinite-scroll.mdx`, `selection/selection-bar.mdx`,
 * `columns/column-helper.mdx`). `columns/resizing.mdx` is why that follow-up
 * happened: it documented a `sizing` option that has never existed, and went on
 * doing so precisely because the page was unmapped. The remaining pages under
 * `content/docs/data-grid/**` are intentionally absent — their types and
 * defaults were never verified, so adding them would make the suite red on
 * arrival.
 *
 * ## Adding a page
 *
 * 1. Verify the page's tables against the real types by hand first.
 * 2. Add its path to {@link DocPage}.
 * 3. Add a {@link PageEntry}: one `optionTables` entry per table whose first
 *    column names config keys, one `nonOptionTables` entry (with a reason) per
 *    table that documents something else. Every table in the file must be
 *    accounted for — the test fails on an unclassified table.
 */

/** In-scope documentation pages, relative to `apps/docs/`. */
export enum DocPage {
	AdvancedReact = 'content/docs/data-grid/advanced/react.mdx',
	CellsDateCell = 'content/docs/data-grid/cells/date-cell.mdx',
	ColumnsColumnHelper = 'content/docs/data-grid/columns/column-helper.mdx',
	ColumnsColumnPinning = 'content/docs/data-grid/columns/column-pinning.mdx',
	ColumnsColumnVisibility = 'content/docs/data-grid/columns/column-visibility.mdx',
	ColumnsIndex = 'content/docs/data-grid/columns/index.mdx',
	ColumnsResizing = 'content/docs/data-grid/columns/resizing.mdx',
	ControlledState = 'content/docs/data-grid/controlled-state.mdx',
	ExpandingControlled = 'content/docs/data-grid/expanding/controlled.mdx',
	ExpandingSubContent = 'content/docs/data-grid/expanding/sub-content.mdx',
	ExpandingTree = 'content/docs/data-grid/expanding/tree.mdx',
	FilteringDateRange = 'content/docs/data-grid/filtering/date-range.mdx',
	FilteringGlobal = 'content/docs/data-grid/filtering/global.mdx',
	FilteringIndex = 'content/docs/data-grid/filtering/index.mdx',
	FilteringMultiValue = 'content/docs/data-grid/filtering/multi-value.mdx',
	FilteringOperators = 'content/docs/data-grid/filtering/operators.mdx',
	FilteringPanel = 'content/docs/data-grid/filtering/panel.mdx',
	PaginationInfiniteScroll = 'content/docs/data-grid/pagination/infinite-scroll.mdx',
	PaginationIndex = 'content/docs/data-grid/pagination/index.mdx',
	Production = 'content/docs/data-grid/production.mdx',
	RowActions = 'content/docs/data-grid/row-actions.mdx',
	RowPinning = 'content/docs/data-grid/row-pinning.mdx',
	SelectionIndex = 'content/docs/data-grid/selection/index.mdx',
	SelectionSelectionBar = 'content/docs/data-grid/selection/selection-bar.mdx',
	Sorting = 'content/docs/data-grid/sorting.mdx',
	StateModel = 'content/docs/data-grid/state-model.mdx',
	Virtualization = 'content/docs/data-grid/virtualization.mdx',
}

/**
 * Types that govern the mapped tables.
 *
 * Note which package each comes from. The per-feature configs live in
 * `@ez-kit/data-grid-core`; `@ez-kit/data-grid-react` re-exports *differently
 * named* React variants (`ReactPaginationConfig`, `ReactFilteringConfig`, …)
 * that carry extra React-only slots. Where a docs table documents a slot that
 * only exists in React (`filtering.chips`, `globalFiltering.toolbar`), the
 * React variant is the correct governing type — it is what
 * `UseDataGridConfig[key]` actually resolves to.
 */
export const GRID_TYPE = {
	/** Root config object passed to `useDataGrid()`. */
	UseDataGridConfig: { module: TypeModule.React, name: 'UseDataGridConfig', typeArgs: ROW_TYPE_ARGS },
	ColumnDef: { module: TypeModule.Core, name: 'ColumnDef', typeArgs: ROW_TYPE_ARGS },
	TableState: { module: TypeModule.Core, name: 'TableState' },
	SortingConfig: { module: TypeModule.Core, name: 'SortingConfig' },
	ReactSortingConfig: { module: TypeModule.React, name: 'ReactSortingConfig' },
	MultiSortConfig: { module: TypeModule.Core, name: 'MultiSortConfig' },
	ColumnSortingConfig: { module: TypeModule.Core, name: 'ColumnSortingConfig' },
	ColumnFilteringConfig: { module: TypeModule.Core, name: 'ColumnFilteringConfig' },
	ColumnOperatorsConfig: { module: TypeModule.Core, name: 'ColumnOperatorsConfig' },
	BetweenOperatorConfig: { module: TypeModule.Core, name: 'BetweenOperatorConfig' },
	FilterOperatorDef: { module: TypeModule.Core, name: 'FilterOperatorDef' },
	DateRangePreset: { module: TypeModule.Core, name: 'DateRangePreset' },
	DateCellConfig: { module: TypeModule.Core, name: 'DateCellConfig' },
	SelectCellConfig: { module: TypeModule.Core, name: 'SelectCellConfig' },
	BadgeCellConfig: { module: TypeModule.Core, name: 'BadgeCellConfig' },
	ReactFilteringConfig: { module: TypeModule.React, name: 'ReactFilteringConfig' },
	ReactGlobalFilteringConfig: { module: TypeModule.React, name: 'ReactGlobalFilteringConfig' },
	FilterChipsConfig: { module: TypeModule.React, name: 'FilterChipsConfig' },
	FilteringToolbarConfig: { module: TypeModule.React, name: 'FilteringToolbarConfig' },
	VirtualizationConfig: { module: TypeModule.Core, name: 'VirtualizationConfig' },
	SelectionPanelConfig: { module: TypeModule.React, name: 'SelectionPanelConfig', typeArgs: ROW_TYPE_ARGS },
	RowActionItem: { module: TypeModule.Core, name: 'RowActionItem' },
} as const satisfies Record<string, TypeRef>

/** Zero-based index of the table column that names the option. */
export enum OptionColumn {
	First = 0,
	Second = 1,
}

export type OptionTable = {
	/** Heading text exactly as written in the MDX, markdown markup included. */
	readonly heading: string
	/**
	 * Types the documented names are checked against. A name is legal when it
	 * resolves against **any** of them — used where one table deliberately mixes
	 * table-level and per-column options that share a name.
	 */
	readonly roots: readonly TypeRef[]
	/**
	 * Prefix the table writes in front of every path, stripped before
	 * resolution (e.g. rows written as `config.minValue` against
	 * `DateCellConfig`). A row that lacks the prefix fails unless excepted.
	 */
	readonly stripPrefix?: string
	/** Which column names the option. Defaults to {@link OptionColumn.First}. */
	readonly column?: OptionColumn
	/**
	 * How many option names this table is expected to resolve — i.e. its
	 * non-excepted code spans in the addressed column, counted today.
	 *
	 * The test asserts the real count *equals* this. A bare "checks at least
	 * one" guard would stay green through a parser regression that silently
	 * dropped most rows; pinning the number makes any shrinkage loud. Update it
	 * deliberately when the table gains or loses a documented option.
	 */
	readonly expectedCount: number
}

export type NonOptionTable = {
	readonly heading: string
	/** Why this table names no config keys. Required — an unexplained skip is a hole. */
	readonly reason: string
}

export type PageEntry = {
	readonly page: DocPage
	readonly optionTables: readonly OptionTable[]
	readonly nonOptionTables: readonly NonOptionTable[]
}

const CELL_CONFIG_PREFIX = 'config.'

export const PAGE_ENTRIES: readonly PageEntry[] = [
	{
		page: DocPage.AdvancedReact,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Public surface (overview)',
				reason: 'Lists the package\'s exported symbols ("what it is"), not keys of any config object.',
			},
		],
	},
	{
		page: DocPage.CellsDateCell,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.DateCellConfig], expectedCount: 3 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsColumnPinning,
		optionTables: [
			// One table, two sources: `pinning` on a column def and `pinning` on the
			// grid config, disambiguated in prose ("(column def)" / "(table)").
			// `state.columnPinning` / `initialState.columnPinning` resolve as real
			// `UseDataGridConfig` paths, so they need no exception.
			{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig], expectedCount: 4 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsColumnVisibility,
		// 3, not 4: the `enableHiding` row is gone — it was the raw TanStack pass-through that
		// duplicated `visibility`, and `ColumnDef` no longer accepts it.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig], expectedCount: 3 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsIndex,
		// 22, not 12: the table used to stop at the twelve options the original audit checked.
		// The follow-up added the ten `ColumnDef` keys it had simply never listed — `footer`,
		// `columns`, `globalFiltering`, `editing`, `creating`, `validateOn`,
		// `validateDebounceMs` and the three `*ClassName` slots, of which `cellClassName` is
		// the only public route to colouring a cell from its own value.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef], expectedCount: 22 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsColumnHelper,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Options',
				reason:
					'Documents the builder methods `createColumnHelper()` returns (`createColumn.text(opts)`, …) and the ' +
					'shape of their argument, not keys of a config object. The column keys those builders produce are ' +
					'checked on columns/index.mdx against `ColumnDef`.',
			},
		],
	},
	{
		page: DocPage.ColumnsResizing,
		// Two levels in one table on purpose: the feature config and the state/callback that
		// carry it live on the grid, the `width` row on a column def.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig], expectedCount: 7 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ControlledState,
		optionTables: [
			// The option names live in the second column ("State key"); the first is
			// a prose slot label ("Row selection"). The governing type is the
			// TanStack `TableState` the grid augments.
			{
				heading: 'Every controllable slot',
				roots: [GRID_TYPE.TableState],
				column: OptionColumn.Second,
				expectedCount: 11,
			},
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.ExpandingControlled,
		// The page documents controlled expansion entirely in prose and code
		// samples; it has no tables at all.
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.ExpandingSubContent,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ExpandingTree,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 2 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringDateRange,
		optionTables: [
			{ heading: '`betweenOperator`', roots: [GRID_TYPE.BetweenOperatorConfig], expectedCount: 2 },
			{ heading: '`DateRangePreset`', roots: [GRID_TYPE.DateRangePreset], expectedCount: 3 },
			{
				heading: '`cell` (date)',
				roots: [GRID_TYPE.DateCellConfig],
				stripPrefix: CELL_CONFIG_PREFIX,
				expectedCount: 3,
			},
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringGlobal,
		optionTables: [{ heading: '`globalFiltering`', roots: [GRID_TYPE.ReactGlobalFilteringConfig], expectedCount: 6 }],
		nonOptionTables: [
			{
				heading: 'Per-column `globalFiltering`',
				reason:
					'Documents the one literal value the per-column `globalFiltering` flag accepts (`false`), not keys of a config object.',
			},
		],
	},
	{
		page: DocPage.FilteringIndex,
		optionTables: [
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig], expectedCount: 8 },
			{ heading: 'Per-column `filtering`', roots: [GRID_TYPE.ColumnFilteringConfig], expectedCount: 5 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringMultiValue,
		optionTables: [
			{
				heading: '`cell` (select / badge)',
				roots: [GRID_TYPE.SelectCellConfig, GRID_TYPE.BadgeCellConfig],
				stripPrefix: CELL_CONFIG_PREFIX,
				expectedCount: 1,
			},
			{ heading: 'Per-column `filtering`', roots: [GRID_TYPE.ColumnFilteringConfig], expectedCount: 4 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringOperators,
		optionTables: [
			{ heading: '`ColumnOperatorsConfig`', roots: [GRID_TYPE.ColumnOperatorsConfig], expectedCount: 2 },
			{ heading: '`BetweenOperatorConfig`', roots: [GRID_TYPE.BetweenOperatorConfig], expectedCount: 4 },
			{ heading: '`FilterOperatorDef`', roots: [GRID_TYPE.FilterOperatorDef], expectedCount: 4 },
		],
		nonOptionTables: [
			{
				heading: 'Built-in operators',
				reason: 'Lists operator ids (`contains`, `between`, …) — filter values, not keys of any config type.',
			},
		],
	},
	{
		page: DocPage.FilteringPanel,
		optionTables: [
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig], expectedCount: 4 },
			{ heading: '`FilterChipsConfig`', roots: [GRID_TYPE.FilterChipsConfig], expectedCount: 1 },
			{ heading: '`FilteringToolbarConfig`', roots: [GRID_TYPE.FilteringToolbarConfig], expectedCount: 1 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.PaginationInfiniteScroll,
		optionTables: [{ heading: 'API', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 5 }],
		nonOptionTables: [
			{
				heading: 'Status, errors & retry',
				reason:
					'Contrasts the two fields of the grid-owned `state.infinite` slice with the user-owned ' +
					'`pagination.hasNextPage` option — the table is about *ownership*, so its rows deliberately ' +
					'come from two different types rather than naming keys of one.',
			},
		],
	},
	{
		page: DocPage.PaginationIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 10 }],
		nonOptionTables: [
			{
				heading: 'When the total is unknown',
				reason:
					'Compares the three `pagination.variant` values against data availability; the rows are values, not keys.',
			},
		],
	},
	{
		page: DocPage.Production,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'What is turned on',
				reason:
					'Prose inventory of which capabilities the showcase enables, grouped by area — the rows are feature names, not config keys.',
			},
		],
	},
	{
		page: DocPage.RowActions,
		optionTables: [
			{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 2 },
			// Rows are the fields of one custom entry, not keys of the grid config.
			{ heading: 'Entry shape', roots: [GRID_TYPE.RowActionItem], expectedCount: 6 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.RowPinning,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.SelectionIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 6 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.SelectionSelectionBar,
		// The table's rows are bare keys of `selection.panel`, so the governing type is the
		// panel config itself rather than the grid root.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.SelectionPanelConfig], expectedCount: 5 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.StateModel,
		optionTables: [
			// One table crossing both levels on purpose: the page's whole point is
			// that a starting value can come from a column def *or* from the grid
			// config, so the column-level rows resolve against `ColumnDef` and the
			// grid-level ones against `UseDataGridConfig`.
			{
				heading: 'Where a starting value comes from',
				roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig],
				expectedCount: 8,
			},
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.Virtualization,
		// Two roots because the table addresses the option from two depths: the first two rows
		// are full paths from the grid config, the last two are written relative to `row`.
		optionTables: [
			{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig, GRID_TYPE.VirtualizationConfig], expectedCount: 4 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.Sorting,
		optionTables: [
			{ heading: '`sorting`', roots: [GRID_TYPE.ReactSortingConfig], expectedCount: 7 },
			{ heading: '`MultiSortConfig`', roots: [GRID_TYPE.MultiSortConfig], expectedCount: 3 },
			{ heading: 'Per-column `sorting`', roots: [GRID_TYPE.ColumnSortingConfig], expectedCount: 5 },
		],
		nonOptionTables: [],
	},
]

/**
 * Rows that deliberately document something other than a config key.
 *
 * Every entry carries its reason. Without one this list turns into a dumping
 * ground and the checker quietly stops checking anything.
 */
export type OptionException = {
	readonly page: DocPage
	readonly heading: string
	/** The documented name exactly as it appears in the table's code span. */
	readonly name: string
	readonly reason: string
}

export const OPTION_EXCEPTIONS: readonly OptionException[] = [
	{
		page: DocPage.PaginationInfiniteScroll,
		heading: 'API',
		name: 'table.appendData(rows)',
		reason:
			'A method on the table instance, listed beside the `pagination` options it is used with. Not a config key — ' +
			'it is called, not passed.',
	},
	{
		page: DocPage.Sorting,
		heading: 'Per-column `sorting`',
		name: 'false',
		reason:
			'A literal value the whole per-column `sorting` slot accepts (`sorting: false` disables sorting for the column), not a key of `ColumnSortingConfig`.',
	},
	{
		page: DocPage.FilteringIndex,
		heading: 'Per-column `filtering`',
		name: 'false',
		reason:
			'A literal value the whole per-column `filtering` slot accepts (`filtering: false`), not a key of `ColumnFilteringConfig`.',
	},
	{
		page: DocPage.FilteringMultiValue,
		heading: '`cell` (select / badge)',
		name: 'type',
		reason:
			'The cell-def discriminant (`cell.type`), which selects *which* config type applies — it sits beside `config`, not inside it, and is covered by the `cell` row on columns/index.mdx.',
	},
]
