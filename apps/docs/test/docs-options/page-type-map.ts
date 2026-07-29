import { ROW_TYPE_ARGS, TypeModule, type TypeRef } from './type-resolver'

/**
 * The explicit page → type map behind `docs-option-names.test.ts`.
 *
 * Every entry is hand-written on purpose. Nothing here is inferred by crawling
 * the docs tree: an unmapped page is *visibly* absent rather than silently
 * skipped, which is the only way coverage stays an honest number.
 *
 * Scope: the 19 data-grid pages whose option tables were hand-verified against
 * the real types in the #171-#174 audit slices. The remaining pages under
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
	ColumnsColumnPinning = 'content/docs/data-grid/columns/column-pinning.mdx',
	ColumnsColumnVisibility = 'content/docs/data-grid/columns/column-visibility.mdx',
	ColumnsIndex = 'content/docs/data-grid/columns/index.mdx',
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
	PaginationIndex = 'content/docs/data-grid/pagination/index.mdx',
	RowPinning = 'content/docs/data-grid/row-pinning.mdx',
	SelectionIndex = 'content/docs/data-grid/selection/index.mdx',
	Sorting = 'content/docs/data-grid/sorting.mdx',
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
	FilterClearButtonConfig: { module: TypeModule.React, name: 'FilterClearButtonConfig' },
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
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.DateCellConfig] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsColumnPinning,
		optionTables: [
			// One table, two sources: `pinning` on a column def and `pinning` on the
			// grid config, disambiguated in prose ("(column def)" / "(table)").
			// `state.columnPinning` / `initialState.columnPinning` resolve as real
			// `UseDataGridConfig` paths, so they need no exception.
			{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig] },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsColumnVisibility,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ControlledState,
		optionTables: [
			// The option names live in the second column ("State key"); the first is
			// a prose slot label ("Row selection"). The governing type is the
			// TanStack `TableState` the grid augments.
			{ heading: 'Every controllable slot', roots: [GRID_TYPE.TableState], column: OptionColumn.Second },
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
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ExpandingTree,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringDateRange,
		optionTables: [
			{ heading: '`betweenOperator`', roots: [GRID_TYPE.BetweenOperatorConfig] },
			{ heading: '`DateRangePreset`', roots: [GRID_TYPE.DateRangePreset] },
			{ heading: '`cell` (date)', roots: [GRID_TYPE.DateCellConfig], stripPrefix: CELL_CONFIG_PREFIX },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringGlobal,
		optionTables: [{ heading: '`globalFiltering`', roots: [GRID_TYPE.ReactGlobalFilteringConfig] }],
		nonOptionTables: [
			{
				heading: 'Per-column `globalFilter`',
				reason:
					'Documents the one literal value the per-column `globalFilter` flag accepts (`false`), not keys of a config object.',
			},
		],
	},
	{
		page: DocPage.FilteringIndex,
		optionTables: [
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig] },
			{ heading: 'Per-column `filtering`', roots: [GRID_TYPE.ColumnFilteringConfig] },
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
			},
			{ heading: 'Per-column `filtering`', roots: [GRID_TYPE.ColumnFilteringConfig] },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FilteringOperators,
		optionTables: [
			{ heading: '`ColumnOperatorsConfig`', roots: [GRID_TYPE.ColumnOperatorsConfig] },
			{ heading: '`BetweenOperatorConfig`', roots: [GRID_TYPE.BetweenOperatorConfig] },
			{ heading: '`FilterOperatorDef`', roots: [GRID_TYPE.FilterOperatorDef] },
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
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig] },
			{ heading: '`FilterChipsConfig`', roots: [GRID_TYPE.FilterChipsConfig] },
			{ heading: '`FilterClearButtonConfig`', roots: [GRID_TYPE.FilterClearButtonConfig] },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.PaginationIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig] }],
		nonOptionTables: [
			{
				heading: 'When the total is unknown',
				reason:
					'Compares the three `pagination.variant` values against data availability; the rows are values, not keys.',
			},
		],
	},
	{
		page: DocPage.RowPinning,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.SelectionIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig] }],
		nonOptionTables: [],
	},
	{
		page: DocPage.Sorting,
		optionTables: [
			{ heading: '`sorting`', roots: [GRID_TYPE.SortingConfig] },
			{ heading: '`MultiSortConfig`', roots: [GRID_TYPE.MultiSortConfig] },
			{ heading: 'Per-column `sorting`', roots: [GRID_TYPE.ColumnSortingConfig] },
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
