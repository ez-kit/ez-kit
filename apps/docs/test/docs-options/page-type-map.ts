import { FORM_API_TYPE_ARGS, FORM_VALUE_TYPE_ARGS, ROW_TYPE_ARGS, TypeModule, type TypeRef } from './type-resolver'

/**
 * The explicit page → type map behind `docs-option-names.test.ts`.
 *
 * Every entry is hand-written on purpose. Nothing here is inferred by crawling
 * the docs tree: an unmapped page is *visibly* absent rather than silently
 * skipped, which is the only way coverage stays an honest number.
 *
 * Scope: **every** page under `content/docs/data-grid/**`, plus the four
 * `form/` pages that carry at least one option table. A page with no option
 * table still gets an entry with two empty arrays — that is the point. While
 * coverage was partial, an unmapped page was checked by nothing, and the two
 * worst pages in the docs were unmapped ones: `columns/resizing.mdx`
 * documented a `sizing` option that never existed, and the whole `editing/**`
 * section documented a `meta.editType` / `onCellEdit` API that never existed.
 * With the set closed, `everyPageIsMapped` fails the moment a page is added
 * without being classified, so the hole cannot reopen. `form/index.mdx` and
 * `form/ai.mdx` are absent for the opposite reason: every table on them
 * documents exported symbols or URLs, so an entry would carry a maintenance
 * obligation while checking nothing.
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
export const DocPage = {
	AdvancedReact: 'content/docs/data-grid/advanced/react.mdx',
	AdvancedCore: 'content/docs/data-grid/advanced/core.mdx',
	Ai: 'content/docs/data-grid/ai.mdx',
	Architecture: 'content/docs/data-grid/architecture.mdx',
	CellsCellTypes: 'content/docs/data-grid/cells/cell-types.mdx',
	CellsCustomCellTypes: 'content/docs/data-grid/cells/custom-cell-types.mdx',
	Composition: 'content/docs/data-grid/composition.mdx',
	DefaultOptions: 'content/docs/data-grid/default-options.mdx',
	Defaults: 'content/docs/data-grid/defaults.mdx',
	EditingCreating: 'content/docs/data-grid/editing/creating.mdx',
	EditingCrudClient: 'content/docs/data-grid/editing/crud-client.mdx',
	EditingCrudServer: 'content/docs/data-grid/editing/crud-server.mdx',
	EditingDeleteConfirmation: 'content/docs/data-grid/editing/delete-confirmation.mdx',
	EditingIndex: 'content/docs/data-grid/editing/index.mdx',
	EditingValidation: 'content/docs/data-grid/editing/validation.mdx',
	Fallbacks: 'content/docs/data-grid/fallbacks.mdx',
	Footer: 'content/docs/data-grid/footer.mdx',
	Features: 'content/docs/data-grid/features.mdx',
	GettingStarted: 'content/docs/data-grid/getting-started.mdx',
	Index: 'content/docs/data-grid/index.mdx',
	InstallationHeroui: 'content/docs/data-grid/installation/heroui.mdx',
	InstallationShadcn: 'content/docs/data-grid/installation/shadcn.mdx',
	ServerSide: 'content/docs/data-grid/server-side.mdx',
	StatePersistence: 'content/docs/data-grid/state-persistence.mdx',
	StickyHeader: 'content/docs/data-grid/sticky-header.mdx',
	Theming: 'content/docs/data-grid/theming.mdx',
	CellsDateCell: 'content/docs/data-grid/cells/date-cell.mdx',
	ColumnsColumnHelper: 'content/docs/data-grid/columns/column-helper.mdx',
	ColumnsColumnPinning: 'content/docs/data-grid/columns/column-pinning.mdx',
	ColumnsColumnVisibility: 'content/docs/data-grid/columns/column-visibility.mdx',
	ColumnsIndex: 'content/docs/data-grid/columns/index.mdx',
	ColumnsResizing: 'content/docs/data-grid/columns/resizing.mdx',
	ControlledState: 'content/docs/data-grid/controlled-state.mdx',
	ExpandingControlled: 'content/docs/data-grid/expanding/controlled.mdx',
	ExpandingSubContent: 'content/docs/data-grid/expanding/sub-content.mdx',
	ExpandingTree: 'content/docs/data-grid/expanding/tree.mdx',
	FilteringDateRange: 'content/docs/data-grid/filtering/date-range.mdx',
	FilteringGlobal: 'content/docs/data-grid/filtering/global.mdx',
	FilteringIndex: 'content/docs/data-grid/filtering/index.mdx',
	FilteringMultiValue: 'content/docs/data-grid/filtering/multi-value.mdx',
	FilteringOperators: 'content/docs/data-grid/filtering/operators.mdx',
	FilteringPanel: 'content/docs/data-grid/filtering/panel.mdx',
	FormCustomKit: 'content/docs/form/custom-kit.mdx',
	FormFields: 'content/docs/form/fields.mdx',
	FormLayout: 'content/docs/form/layout.mdx',
	FormNativeApi: 'content/docs/form/native-api.mdx',
	FormSchema: 'content/docs/form/schema.mdx',
	PaginationInfiniteScroll: 'content/docs/data-grid/pagination/infinite-scroll.mdx',
	PaginationIndex: 'content/docs/data-grid/pagination/index.mdx',
	Production: 'content/docs/data-grid/production.mdx',
	RowActions: 'content/docs/data-grid/row-actions.mdx',
	RowPinning: 'content/docs/data-grid/row-pinning.mdx',
	SelectionIndex: 'content/docs/data-grid/selection/index.mdx',
	SelectionSelectionBar: 'content/docs/data-grid/selection/selection-bar.mdx',
	Sorting: 'content/docs/data-grid/sorting.mdx',
	StateModel: 'content/docs/data-grid/state-model.mdx',
	Virtualization: 'content/docs/data-grid/virtualization.mdx',
} as const

export type DocPage = (typeof DocPage)[keyof typeof DocPage]

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
	LinkCellConfig: { module: TypeModule.Core, name: 'LinkCellConfig' },
	SelectCellConfig: { module: TypeModule.Core, name: 'SelectCellConfig' },
	BadgeCellConfig: { module: TypeModule.Core, name: 'BadgeCellConfig' },
	ReactFilteringConfig: { module: TypeModule.React, name: 'ReactFilteringConfig' },
	ReactPaginationConfig: { module: TypeModule.React, name: 'ReactPaginationConfig' },
	ReactGlobalFilteringConfig: { module: TypeModule.React, name: 'ReactGlobalFilteringConfig' },
	FilterChipsConfig: { module: TypeModule.React, name: 'FilterChipsConfig' },
	FilteringToolbarConfig: { module: TypeModule.React, name: 'FilteringToolbarConfig' },
	VirtualizationConfig: { module: TypeModule.Core, name: 'VirtualizationConfig' },
	SelectionBarConfig: { module: TypeModule.React, name: 'SelectionBarConfig', typeArgs: ROW_TYPE_ARGS },
	ActionItem: { module: TypeModule.Core, name: 'ActionItem' },
	SystemColumnDef: { module: TypeModule.Core, name: 'SystemColumnDef' },
	EditingConfig: { module: TypeModule.Core, name: 'EditingConfig', typeArgs: ROW_TYPE_ARGS },
	CreatingConfig: { module: TypeModule.Core, name: 'CreatingConfig', typeArgs: ROW_TYPE_ARGS },
	LoadingState: { module: TypeModule.Core, name: 'LoadingState' },
	DeletingConfig: { module: TypeModule.Core, name: 'DeletingConfig', typeArgs: ROW_TYPE_ARGS },
	BulkDeletingConfig: { module: TypeModule.Core, name: 'BulkDeletingConfig', typeArgs: ROW_TYPE_ARGS },
	CellTypeDefinition: { module: TypeModule.React, name: 'CellTypeDefinition' },
	LayoutConfig: { module: TypeModule.React, name: 'LayoutConfig' },
} as const satisfies Record<string, TypeRef>

/**
 * Types that govern the mapped `form/` tables.
 *
 * The split mirrors the packages: `@ez-kit/form-core` owns the serialisable
 * document (`SubmitNode`, `FieldValidate`), `@ez-kit/form-react` owns both
 * halves of the React surface — the *consumer* props a caller writes
 * (`BaseFieldProps`, `SliderFieldProps`, …) and the *kit contract* props a kit
 * receives (`FieldRenderProps`, `FormComponents`).
 */
export const FORM_TYPE = {
	/**
	 * Governs "what every node may carry". `CommonProps` — the type that actually
	 * declares those five keys — is internal to `@ez-kit/form-core`, so the
	 * tightest exported stand-in is the leanest node built on it: `SubmitNode` is
	 * `CommonProps` plus `type` and `disabled` and nothing else, so a name that
	 * resolves here really is common to every node. A laxer choice such as
	 * `FormNode` would also accept `columns`, `path` and `component`, which are
	 * exactly the per-kind keys this table must not bless.
	 */
	SubmitNode: { module: TypeModule.FormCore, name: 'SubmitNode', typeArgs: ROW_TYPE_ARGS },
	FieldValidate: { module: TypeModule.FormCore, name: 'FieldValidate' },
	/**
	 * The props every flat field shares. Written once as
	 * `BaseFieldProps<TFormData, TValue>` and intersected into each field's own
	 * props, so it is the exact governing type for the "Shared props" table —
	 * `TextFieldProps` would additionally bless `placeholder` and `type`.
	 */
	BaseFieldProps: { module: TypeModule.FormReact, name: 'BaseFieldProps', typeArgs: FORM_VALUE_TYPE_ARGS },
	SliderFieldProps: { module: TypeModule.FormReact, name: 'SliderFieldProps', typeArgs: ROW_TYPE_ARGS },
	/** The JSX layout pair — neither is generic, both are pure presentation. */
	SectionProps: { module: TypeModule.FormReact, name: 'SectionProps' },
	GridItemProps: { module: TypeModule.FormReact, name: 'GridItemProps' },
	/** The `section` node — `CommonProps` (so `colSpan`) plus the grid's own keys. */
	SectionNode: { module: TypeModule.FormCore, name: 'SectionNode', typeArgs: ROW_TYPE_ARGS },
	DateFieldProps: { module: TypeModule.FormReact, name: 'DateFieldProps', typeArgs: ROW_TYPE_ARGS },
	/** What a kit's field component receives — the base half of the `FormComponents` contract. */
	FieldRenderProps: { module: TypeModule.FormReact, name: 'FieldRenderProps' },
	/** The kit contract itself; its keys are the component slots a kit must supply. */
	FormComponents: { module: TypeModule.FormReact, name: 'FormComponents' },
	FormRendererControlledProps: {
		module: TypeModule.FormReact,
		name: 'FormRendererControlledProps',
		typeArgs: ROW_TYPE_ARGS,
	},
	FormRendererUncontrolledProps: {
		module: TypeModule.FormReact,
		name: 'FormRendererUncontrolledProps',
		typeArgs: FORM_API_TYPE_ARGS,
	},
	/** The instance `useForm` returns: TanStack's own API plus the flat field components. */
	KitFormApi: { module: TypeModule.FormReact, name: 'KitFormApi', typeArgs: FORM_API_TYPE_ARGS },
} as const satisfies Record<string, TypeRef>

/** Zero-based index of the table column that names the option. */
export const OptionColumn = {
	First: 0,
	Second: 1,
} as const

export type OptionColumn = (typeof OptionColumn)[keyof typeof OptionColumn]

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
	 * resolution (e.g. rows written as `config.min` against
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
/** Receiver the native-API table writes in front of every member it documents. */
const FORM_RECEIVER_PREFIX = 'form.'

export const PAGE_ENTRIES: readonly PageEntry[] = [
	{
		page: DocPage.Architecture,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.Composition,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Header rows and cells: keep the chrome, change the markup',
				reason:
					'Names the render args `<DataGrid.HeaderCell>` hands its children (`label`, `sortTrigger`, `menu`, `filter`, …), not config keys — they are properties of a callback argument, not options anyone sets.',
			},
			{
				heading: 'Fallbacks, modals and bars',
				reason:
					'Maps compound slots to the condition that mounts them and the render args they pass. The left column is JSX element names, not option keys.',
			},
		],
	},
	{
		page: DocPage.EditingCrudClient,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.EditingCrudServer,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.EditingDeleteConfirmation,
		optionTables: [
			{ heading: '`deleting`', roots: [GRID_TYPE.DeletingConfig], expectedCount: 4 },
			{ heading: '`deleting.bulk`', roots: [GRID_TYPE.BulkDeletingConfig], expectedCount: 3 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.Fallbacks,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.Footer,
		optionTables: [
			{ heading: 'Column options', roots: [GRID_TYPE.ColumnDef], expectedCount: 2 },
			{ heading: 'Mounting', roots: [GRID_TYPE.LayoutConfig], expectedCount: 2 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.Features,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.InstallationHeroui,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.InstallationShadcn,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.StatePersistence,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.StickyHeader,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.AdvancedCore,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Public surface (overview)',
				reason: 'Lists the package\'s exported symbols ("what it is"), not keys of any config object.',
			},
		],
	},
	{
		page: DocPage.Ai,
		optionTables: [],
		nonOptionTables: [{ heading: 'Use with AI', reason: 'A list of documentation URLs.' }],
	},
	{
		page: DocPage.CellsCellTypes,
		optionTables: [{ heading: "`'link'`", roots: [GRID_TYPE.LinkCellConfig], expectedCount: 3 }],
		nonOptionTables: [
			{
				heading: 'Built-in cell types',
				reason: "First column holds `cell.type` *values* ('text', 'number', …), not keys of a config object.",
			},
		],
	},
	{
		page: DocPage.CellsCustomCellTypes,
		// The four renderer slots a `defineCellType` definition may carry.
		optionTables: [{ heading: 'Declaring a config', roots: [GRID_TYPE.CellTypeDefinition], expectedCount: 4 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.DefaultOptions,
		// The keys a defaults layer deliberately cannot carry — real `UseDataGridConfig` keys,
		// which is exactly what makes the row meaningful.
		optionTables: [{ heading: 'What can be defaulted', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 }],
		nonOptionTables: [{ heading: 'When to use which', reason: 'Maps a situation to an API, naming no keys.' }],
	},
	{
		page: DocPage.Defaults,
		optionTables: [{ heading: 'Reference', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 39 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.EditingCreating,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.CreatingConfig], expectedCount: 7 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.EditingIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.EditingConfig], expectedCount: 6 }],
		nonOptionTables: [{ heading: 'Modes', reason: "First column holds `mode` *values* ('row', 'modal', 'cell')." }],
	},
	{
		page: DocPage.EditingValidation,
		// The three validation keys, shared verbatim by `editing` and `creating`.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.EditingConfig], expectedCount: 3 }],
		nonOptionTables: [
			{ heading: 'When it runs', reason: "First column holds `validateOn` *values* ('submit', 'blur', 'change')." },
		],
	},
	{
		page: DocPage.GettingStarted,
		optionTables: [],
		nonOptionTables: [{ heading: '1. Pick a flavor', reason: 'Maps a UI kit to its install guide.' }],
	},
	{
		page: DocPage.Index,
		optionTables: [],
		nonOptionTables: [{ heading: 'Packages', reason: 'Lists the published packages and who imports them.' }],
	},
	{
		page: DocPage.ServerSide,
		optionTables: [
			// Each table is headed by the feature it configures and lists that config's own keys,
			// so the governing type is the feature config, not the root.
			{ heading: '`pagination`', roots: [GRID_TYPE.ReactPaginationConfig], expectedCount: 3 },
			{ heading: '`sorting`', roots: [GRID_TYPE.ReactSortingConfig], expectedCount: 2 },
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig], expectedCount: 2 },
			{ heading: '`globalFiltering`', roots: [GRID_TYPE.ReactGlobalFilteringConfig], expectedCount: 1 },
			{ heading: '`state.loading`', roots: [GRID_TYPE.LoadingState], expectedCount: 4 },
		],
		nonOptionTables: [
			{
				heading: 'Loading status',
				reason:
					'First column holds state predicates ("`isPending: true`"), not keys — the row names what the grid renders for each.',
			},
		],
	},
	{
		page: DocPage.Theming,
		optionTables: [],
		nonOptionTables: [{ heading: 'Where to look', reason: 'Maps a UI kit to where its design tokens live.' }],
	},
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
			{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig], expectedCount: 6 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsColumnVisibility,
		// The `enableHiding` row is gone — it was the raw TanStack pass-through that
		// duplicated `visibility`, and `ColumnDef` no longer accepts it.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig], expectedCount: 6 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsIndex,
		// 20, not 12: the table used to stop at the twelve options the original audit checked.
		// A follow-up added the `ColumnDef` keys it had simply never listed — `footer`,
		// `columns`, `globalFiltering`, `editing`, `creating` and the three `*ClassName` slots,
		// of which `cellClassName` is the only public route to colouring a cell from its own
		// value. `validateOn` / `debounce` left the column root again in the API
		// audit: they configure one of `editing` / `creating`, so they are documented as keys
		// of those, where every other per-feature column setting already lives.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef], expectedCount: 20 }],
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
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.UseDataGridConfig], expectedCount: 8 }],
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
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 6 }],
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
		optionTables: [{ heading: '`globalFiltering`', roots: [GRID_TYPE.ReactGlobalFilteringConfig], expectedCount: 7 }],
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
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig], expectedCount: 9 },
			{ heading: 'Per-column `filtering`', roots: [GRID_TYPE.ColumnFilteringConfig], expectedCount: 6 },
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
		page: DocPage.FormCustomKit,
		optionTables: [
			// The base-props table sits under "Fields"; the per-kind table under the
			// "#### Per-kind props" subheading added for exactly this reason — a
			// heading addresses at most one table.
			{ heading: 'Fields', roots: [FORM_TYPE.FieldRenderProps], expectedCount: 11 },
			{ heading: 'Per-kind props', roots: [FORM_TYPE.FormComponents], expectedCount: 12 },
			{ heading: 'Form level', roots: [FORM_TYPE.FormComponents], expectedCount: 2 },
			{ heading: 'Layout and wizard', roots: [FORM_TYPE.FormComponents], expectedCount: 3 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FormFields,
		optionTables: [
			{ heading: 'Shared props', roots: [FORM_TYPE.BaseFieldProps], expectedCount: 6 },
			{ heading: '`form.SliderField`', roots: [FORM_TYPE.SliderFieldProps], expectedCount: 3 },
			{ heading: '`form.DateField`', roots: [FORM_TYPE.DateFieldProps], expectedCount: 3 },
		],
		nonOptionTables: [
			{
				heading: '`form.CheckboxGroupField`',
				reason:
					'A 2×2 grid placing the four selection fields by cardinality; its cells name components, and its first column is prose with no code span at all.',
			},
			{
				heading: 'Styling hooks',
				reason: 'Documents the `data-*` attributes the field layer emits onto the DOM, not props of any field.',
			},
		],
	},
	{
		page: DocPage.FormLayout,
		optionTables: [
			{ heading: '`form.Section`', roots: [FORM_TYPE.SectionProps], expectedCount: 4 },
			{ heading: '`form.GridItem`', roots: [FORM_TYPE.GridItemProps], expectedCount: 2 },
			{ heading: 'The `section` node', roots: [FORM_TYPE.SectionNode], expectedCount: 6 },
		],
		nonOptionTables: [
			{
				heading: 'Styling hooks',
				reason: 'Documents the `data-slot` attributes both kits emit onto the DOM, not props of any type.',
			},
		],
	},
	{
		page: DocPage.FormNativeApi,
		optionTables: [
			// Rows are written `form.Field`, so the receiver prefix is stripped and
			// the remainder resolved against the instance `useForm` returns.
			{
				heading: 'Native API',
				roots: [FORM_TYPE.KitFormApi],
				stripPrefix: FORM_RECEIVER_PREFIX,
				expectedCount: 6,
			},
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.FormSchema,
		optionTables: [
			{ heading: 'Common node properties', roots: [FORM_TYPE.SubmitNode], expectedCount: 5 },
			{ heading: 'Validation', roots: [FORM_TYPE.FieldValidate], expectedCount: 8 },
			// Two roots because the table documents both modes in one place and marks
			// each row with the mode it belongs to: `form` exists only on the
			// controlled props, `keepHiddenValues` and the `useForm` options only on
			// the uncontrolled ones.
			{
				heading: 'Renderer props',
				roots: [FORM_TYPE.FormRendererControlledProps, FORM_TYPE.FormRendererUncontrolledProps],
				expectedCount: 10,
			},
		],
		nonOptionTables: [
			{
				heading: 'The document',
				reason: 'Lists the node `type` discriminant values (`text`, `section`, `submit`, …) — values, not keys.',
			},
			{
				heading: 'Conditions',
				reason:
					'Documents the shape of a rule object (`{ field, eq: value }`, `{ and: [...] }`) — rule literals, not keys of a config type.',
			},
		],
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
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 13 }],
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
			{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 },
			// Rows are the fields of one custom entry, not keys of the grid config.
			{ heading: 'Entry shape', roots: [GRID_TYPE.ActionItem], expectedCount: 6 },
			// The shared shape `selection.column` / `expanding.column` / `rowActions.column` all
			// take, documented once here and linked to from the other two pages.
			{ heading: 'The column itself', roots: [GRID_TYPE.SystemColumnDef], expectedCount: 6 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.RowPinning,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 5 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.SelectionIndex,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 8 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.SelectionSelectionBar,
		// The table's rows are bare keys of `selection.bar`, so the governing type is the
		// panel config itself rather than the grid root.
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.SelectionBarConfig], expectedCount: 3 }],
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
			{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig, GRID_TYPE.VirtualizationConfig], expectedCount: 5 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.Sorting,
		optionTables: [
			{ heading: '`sorting`', roots: [GRID_TYPE.ReactSortingConfig], expectedCount: 8 },
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
		page: DocPage.Defaults,
		heading: 'Reference',
		name: 'cell.config.target',
		reason:
			'A per-column cell-type config default (`column.cell.config.target` on a `link` cell), listed on the ' +
			'defaults page because that page is the complete list of default *values* — the table is rooted at the ' +
			'grid config, and this one row belongs to a column def.',
	},
	{
		page: DocPage.Defaults,
		heading: 'Reference',
		name: 'link',
		reason: 'Not an option: the cell-type id in the "(`link` cells)" qualifier on the `cell.config.target` row above.',
	},
	{
		page: DocPage.FilteringMultiValue,
		heading: '`cell` (select / badge)',
		name: 'type',
		reason:
			'The cell-def discriminant (`cell.type`), which selects *which* config type applies — it sits beside `config`, not inside it, and is covered by the `cell` row on columns/index.mdx.',
	},
]
