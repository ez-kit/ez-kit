import {
	FORM_API_TYPE_ARGS,
	FORM_VALUE_TYPE_ARGS,
	ROW_TYPE_ARGS,
	STATE_SEED_TYPE_ARGS,
	STATE_TYPE_ARGS,
	STORE_SEED_TYPE_ARGS,
	STORE_SELECTED_TYPE_ARGS,
	TypeModule,
	type TypeRef,
} from './type-resolver'

/** The persist field types are generic over the field's value; any scalar answers the same key question. */
const PERSIST_VALUE_TYPE_ARGS = '<string>'

/**
 * The explicit page → type map behind `docs-option-names.test.ts`.
 *
 * Every entry is hand-written on purpose. Nothing here is inferred by crawling
 * the docs tree: an unmapped page is *visibly* absent rather than silently
 * skipped, which is the only way coverage stays an honest number.
 *
 * Scope: **every** page under the {@link SCANNED_ROOTS} subtrees —
 * `data-grid/**`, `form/**`, `zu-store/**` and `va-store/**`. A page with no
 * option table still gets an entry with two empty arrays — that is the point.
 * While coverage was partial, an unmapped page was checked by nothing, and the
 * two worst pages in the docs were unmapped ones: `columns/resizing.mdx`
 * documented a `sizing` option that never existed, and the whole `editing/**`
 * section documented a `meta.editType` / `onCellEdit` API that never existed.
 * With the set closed — and with the test walking the roots on disk, not
 * trusting this list to be current — a page added tomorrow fails the suite
 * until it is classified. The two pages in {@link DELIBERATELY_UNMAPPED} are
 * exempt for the opposite reason: every table on them documents exported
 * symbols or URLs, so an entry would carry upkeep while checking nothing.
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

/**
 * Docs subtrees whose every `.mdx` must be classified. The test walks these directories and fails on
 * any page that is neither in {@link DocPage} nor in {@link DELIBERATELY_UNMAPPED} — so the map cannot
 * quietly fall behind the docs tree the way it did before coverage was closed.
 */
export const SCANNED_ROOTS: readonly string[] = [
	'content/docs/data-grid',
	'content/docs/form',
	'content/docs/zu-store',
	'content/docs/va-store',
]

/** A page under a scanned root that is deliberately not classified, with the reason it checks nothing. */
export type UnmappedPage = {
	readonly page: string
	readonly reason: string
}

export const DELIBERATELY_UNMAPPED: readonly UnmappedPage[] = [
	{
		page: 'content/docs/form/index.mdx',
		reason: 'Every table documents exported symbols or URLs, so an entry would carry upkeep while checking nothing.',
	},
	{
		page: 'content/docs/form/ai.mdx',
		reason: 'Lists the llms.txt endpoints — URLs, not config keys.',
	},
]

/** In-scope documentation pages, relative to `apps/docs/`. */
export const DocPage = {
	AdvancedReact: 'content/docs/data-grid/advanced/react.mdx',
	AdvancedCore: 'content/docs/data-grid/advanced/core.mdx',
	Ai: 'content/docs/data-grid/ai.mdx',
	Architecture: 'content/docs/data-grid/architecture.mdx',
	ClientVsServer: 'content/docs/data-grid/client-vs-server.mdx',
	ColumnsCellTypes: 'content/docs/data-grid/columns/cell-types.mdx',
	ColumnsCustomCellTypes: 'content/docs/data-grid/columns/custom-cell-types.mdx',
	LayoutComposition: 'content/docs/data-grid/layout/composition.mdx',
	StateDefaults: 'content/docs/data-grid/state/defaults.mdx',
	EditingCreating: 'content/docs/data-grid/editing/creating.mdx',
	EditingCrudClient: 'content/docs/data-grid/editing/crud-client.mdx',
	EditingCrudServer: 'content/docs/data-grid/editing/crud-server.mdx',
	EditingDeleting: 'content/docs/data-grid/editing/deleting.mdx',
	EditingIndex: 'content/docs/data-grid/editing/index.mdx',
	EditingValidation: 'content/docs/data-grid/editing/validation.mdx',
	Fallbacks: 'content/docs/data-grid/fallbacks.mdx',
	LayoutFooter: 'content/docs/data-grid/layout/footer.mdx',
	Features: 'content/docs/data-grid/features.mdx',
	GettingStarted: 'content/docs/data-grid/getting-started.mdx',
	Index: 'content/docs/data-grid/index.mdx',
	InstallationHeroui: 'content/docs/data-grid/installation/heroui.mdx',
	InstallationShadcn: 'content/docs/data-grid/installation/shadcn.mdx',
	StateServerSide: 'content/docs/data-grid/state/server-side.mdx',
	StatePersistence: 'content/docs/data-grid/state/persistence.mdx',
	LayoutIndex: 'content/docs/data-grid/layout/index.mdx',
	Theming: 'content/docs/data-grid/theming.mdx',
	Localization: 'content/docs/data-grid/localization.mdx',
	ExamplesIndex: 'content/docs/data-grid/examples.mdx',
	ColumnsColumnHelper: 'content/docs/data-grid/columns/column-helper.mdx',
	ColumnsOrdering: 'content/docs/data-grid/columns/ordering.mdx',
	PinningApi: 'content/docs/data-grid/pinning/api.mdx',
	PinningColumns: 'content/docs/data-grid/pinning/columns.mdx',
	ColumnsVisibility: 'content/docs/data-grid/columns/visibility.mdx',
	ColumnsIndex: 'content/docs/data-grid/columns/index.mdx',
	ColumnsResizing: 'content/docs/data-grid/columns/resizing.mdx',
	StateControlled: 'content/docs/data-grid/state/controlled.mdx',
	ExpandingControlled: 'content/docs/data-grid/expanding/controlled.mdx',
	ExpandingSubContent: 'content/docs/data-grid/expanding/sub-content.mdx',
	ExpandingTree: 'content/docs/data-grid/expanding/tree.mdx',
	FilteringDateRange: 'content/docs/data-grid/filtering/date-range.mdx',
	FilteringGlobal: 'content/docs/data-grid/filtering/global.mdx',
	FilteringIndex: 'content/docs/data-grid/filtering/index.mdx',
	FilteringMultiValue: 'content/docs/data-grid/filtering/multi-value.mdx',
	FilteringOperators: 'content/docs/data-grid/filtering/operators.mdx',
	FilteringActiveFilters: 'content/docs/data-grid/filtering/active-filters.mdx',
	FilteringVariants: 'content/docs/data-grid/filtering/variants.mdx',
	FormCustomKit: 'content/docs/form/custom-kit.mdx',
	FormFields: 'content/docs/form/fields.mdx',
	FormLayout: 'content/docs/form/layout.mdx',
	FormNativeApi: 'content/docs/form/native-api.mdx',
	FormSchema: 'content/docs/form/schema.mdx',
	FormBasicConcepts: 'content/docs/form/basic-concepts.mdx',
	FormComposition: 'content/docs/form/composition.mdx',
	FormExamples: 'content/docs/form/examples.mdx',
	FormGettingStarted: 'content/docs/form/getting-started.mdx',
	FormInstallationHeroui: 'content/docs/form/installation/heroui.mdx',
	FormInstallationShadcn: 'content/docs/form/installation/shadcn.mdx',
	FormReactivity: 'content/docs/form/reactivity.mdx',
	FormSelectCreatable: 'content/docs/form/select/creatable.mdx',
	FormSelectIndex: 'content/docs/form/select/index.mdx',
	FormSelectOptionSources: 'content/docs/form/select/option-sources.mdx',
	FormSelectSearchable: 'content/docs/form/select/searchable.mdx',
	FormSubmission: 'content/docs/form/submission.mdx',
	FormValidation: 'content/docs/form/validation.mdx',
	PaginationInfiniteScroll: 'content/docs/data-grid/pagination/infinite-scroll.mdx',
	PaginationIndex: 'content/docs/data-grid/pagination/index.mdx',
	PinningIndex: 'content/docs/data-grid/pinning/index.mdx',
	Production: 'content/docs/data-grid/production.mdx',
	RowActionsApi: 'content/docs/data-grid/row-actions/api.mdx',
	RowActionsIndex: 'content/docs/data-grid/row-actions/index.mdx',
	PinningRows: 'content/docs/data-grid/pinning/rows.mdx',
	SelectionIndex: 'content/docs/data-grid/selection/index.mdx',
	SelectionSelectionBar: 'content/docs/data-grid/selection/selection-bar.mdx',
	Sorting: 'content/docs/data-grid/sorting.mdx',
	StateIndex: 'content/docs/data-grid/state/index.mdx',
	Virtualization: 'content/docs/data-grid/virtualization.mdx',

	// --- @ez-kit/zu-store ---
	ZuAi: 'content/docs/zu-store/ai.mdx',
	ZuCacheApi: 'content/docs/zu-store/cache/api.mdx',
	ZuCacheIndex: 'content/docs/zu-store/cache/index.mdx',
	ZuCapabilities: 'content/docs/zu-store/capabilities.mdx',
	ZuCreateContextStoreApi: 'content/docs/zu-store/create-context-store/api.mdx',
	ZuCreateContextStoreIndex: 'content/docs/zu-store/create-context-store/index.mdx',
	ZuGettingStarted: 'content/docs/zu-store/getting-started.mdx',
	ZuHistory: 'content/docs/zu-store/history.mdx',
	ZuIndex: 'content/docs/zu-store/index.mdx',
	ZuPersistCache: 'content/docs/zu-store/persist/cache.mdx',
	ZuPersistCombined: 'content/docs/zu-store/persist/combined.mdx',
	ZuPersistCustomAdapter: 'content/docs/zu-store/persist/custom-adapter.mdx',
	ZuPersistDeepDiveStorage: 'content/docs/zu-store/persist/deep-dive-storage.mdx',
	ZuPersistDeepDiveUrl: 'content/docs/zu-store/persist/deep-dive-url.mdx',
	ZuPersistFields: 'content/docs/zu-store/persist/fields.mdx',
	ZuPersistIndex: 'content/docs/zu-store/persist/index.mdx',
	ZuPersistParsers: 'content/docs/zu-store/persist/parsers.mdx',
	ZuPersistQuickStartStorage: 'content/docs/zu-store/persist/quick-start-storage.mdx',
	ZuPersistQuickStartUrl: 'content/docs/zu-store/persist/quick-start-url.mdx',
	ZuPersistTypescript: 'content/docs/zu-store/persist/typescript.mdx',
	ZuUseStoreState: 'content/docs/zu-store/use-store-state.mdx',

	// --- @ez-kit/va-store ---
	VaAi: 'content/docs/va-store/ai.mdx',
	VaCacheApi: 'content/docs/va-store/cache/api.mdx',
	VaCacheIndex: 'content/docs/va-store/cache/index.mdx',
	VaCapabilities: 'content/docs/va-store/capabilities.mdx',
	VaCreateContextStoreApi: 'content/docs/va-store/create-context-store/api.mdx',
	VaCreateContextStoreIndex: 'content/docs/va-store/create-context-store/index.mdx',
	VaGettingStarted: 'content/docs/va-store/getting-started.mdx',
	VaHistory: 'content/docs/va-store/history.mdx',
	VaIndex: 'content/docs/va-store/index.mdx',
	VaPersistCache: 'content/docs/va-store/persist/cache.mdx',
	VaPersistCombined: 'content/docs/va-store/persist/combined.mdx',
	VaPersistCustomAdapter: 'content/docs/va-store/persist/custom-adapter.mdx',
	VaPersistDecorators: 'content/docs/va-store/persist/decorators.mdx',
	VaPersistDeepDiveStorage: 'content/docs/va-store/persist/deep-dive-storage.mdx',
	VaPersistDeepDiveUrl: 'content/docs/va-store/persist/deep-dive-url.mdx',
	VaPersistFields: 'content/docs/va-store/persist/fields.mdx',
	VaPersistIndex: 'content/docs/va-store/persist/index.mdx',
	VaPersistMigration: 'content/docs/va-store/persist/migration.mdx',
	VaPersistParsers: 'content/docs/va-store/persist/parsers.mdx',
	VaPersistQuickStartStorage: 'content/docs/va-store/persist/quick-start-storage.mdx',
	VaPersistQuickStartUrl: 'content/docs/va-store/persist/quick-start-url.mdx',
	VaPersistTypescript: 'content/docs/va-store/persist/typescript.mdx',
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
	TableOperatorsConfig: { module: TypeModule.Core, name: 'TableOperatorsConfig' },
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
	ActionItemDef: { module: TypeModule.Core, name: 'ActionItemDef' },
	ActionItemSlot: { module: TypeModule.Core, name: 'ActionItemSlot' },
	RowActionItem: { module: TypeModule.Core, name: 'RowActionItem' },
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

/**
 * Types that govern the mapped `zu-store/` and `va-store/` tables.
 *
 * Both bindings re-export the cache types from `@ez-kit/store-core/cache`
 * unchanged, so those are read from the shared package — except the two the
 * bindings define themselves (`CachedSubscribeProps`, and `va-store`'s
 * `CachedStoreProps`), which differ per manager and are read from the binding.
 *
 * The generic instantiations follow the binding's own vocabulary: `zu-store`
 * types are generic over a **store handle** (`StoreApi<TState>`), `va-store`
 * types over the **state object** itself.
 */
export const STORE_TYPE = {
	/**
	 * `zu-store`'s surface. The cache types originate in `@ez-kit/store-core/cache`, but they are read
	 * here through the binding that re-exports them — which is both what a consumer imports and the only
	 * package the docs app depends on.
	 */
	ZuScopeProps: { module: TypeModule.ZuStore, name: 'ScopeProps' },
	ZuStoreCacheController: { module: TypeModule.ZuStore, name: 'StoreCacheController' },
	ZuCachedStoreOptions: { module: TypeModule.ZuStore, name: 'CachedStoreOptions' },
	ZuStoreCacheOptions: { module: TypeModule.ZuStore, name: 'StoreCacheOptions' },
	ZuCachedProviderProps: { module: TypeModule.ZuStore, name: 'CachedProviderProps', typeArgs: STATE_TYPE_ARGS },
	ZuControlledFieldConfig: { module: TypeModule.ZuStore, name: 'ControlledFieldConfig', typeArgs: STATE_TYPE_ARGS },
	/** Generic over the Zustand **handle** — this binding's vocabulary. */
	ZuCachedStoreGroup: { module: TypeModule.ZuStore, name: 'CachedStoreGroup', typeArgs: STORE_SEED_TYPE_ARGS },
	ZuCachedSubscribeProps: {
		module: TypeModule.ZuStore,
		name: 'CachedSubscribeProps',
		typeArgs: STORE_SELECTED_TYPE_ARGS,
	},
	ZuHistoryOptions: { module: TypeModule.ZuStore, name: 'HistoryOptions', typeArgs: STATE_TYPE_ARGS },
	ZuAccessorFieldOptions: {
		module: TypeModule.ZuStorePersist,
		name: 'AccessorFieldOptions',
		typeArgs: PERSIST_VALUE_TYPE_ARGS,
	},

	/** `va-store`'s surface: the same cache types, plus the ones generic over the **state** object. */
	VaScopeProps: { module: TypeModule.VaStore, name: 'ScopeProps' },
	VaStoreCacheController: { module: TypeModule.VaStore, name: 'StoreCacheController' },
	VaCachedStoreOptions: { module: TypeModule.VaStore, name: 'CachedStoreOptions' },
	VaStoreCacheOptions: { module: TypeModule.VaStore, name: 'StoreCacheOptions' },
	VaCachedProviderProps: { module: TypeModule.VaStore, name: 'CachedProviderProps', typeArgs: STATE_TYPE_ARGS },
	VaControlledFieldConfig: { module: TypeModule.VaStore, name: 'ControlledFieldConfig', typeArgs: STATE_TYPE_ARGS },
	VaCachedStoreGroup: { module: TypeModule.VaStore, name: 'CachedStoreGroup', typeArgs: STATE_SEED_TYPE_ARGS },
	VaCachedSubscribeProps: { module: TypeModule.VaStore, name: 'CachedSubscribeProps', typeArgs: STATE_TYPE_ARGS },
	VaCachedStoreProps: { module: TypeModule.VaStore, name: 'CachedStoreProps', typeArgs: STATE_TYPE_ARGS },
	VaHistoryOptions: { module: TypeModule.VaStore, name: 'HistoryOptions', typeArgs: STATE_TYPE_ARGS },
	VaCreateContextStoreOptions: {
		module: TypeModule.VaStore,
		name: 'CreateContextStoreOptions',
		typeArgs: STATE_TYPE_ARGS,
	},
	VaUseSnapshotOptions: { module: TypeModule.VaStore, name: 'UseSnapshotOptions' },
	VaAccessorFieldOptions: {
		module: TypeModule.VaStorePersist,
		name: 'AccessorFieldOptions',
		typeArgs: PERSIST_VALUE_TYPE_ARGS,
	},
	VaPersistFieldOptions: {
		module: TypeModule.VaStorePersist,
		name: 'PersistFieldOptions',
		typeArgs: PERSIST_VALUE_TYPE_ARGS,
	},
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
		page: DocPage.ClientVsServer,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Choosing',
				reason:
					'A side-by-side comparison: the first column is a prose property of the mode ("`data` holds", "Sort / filter latency"), not a key anyone sets.',
			},
		],
	},
	{
		// The narrative half of the split: prose and live examples, every table moved to
		// `pinning/api.mdx` below. Mapped with two empty arrays so the page stays inside
		// `everyPageIsMapped` rather than silently unchecked.
		page: DocPage.PinningIndex,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.PinningApi,
		optionTables: [
			// `pinning.column.onChange` / `pinning.row.top` resolve through the `boolean | …Config`
			// unions the resolver looks past; `getRowId` is here because a row pin is keyed by
			// whatever it returns.
			{ heading: 'Grid options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 9 },
			// The per-column half: `pinning` on a column def, plus the two members of the object
			// form it accepts beside the scalar.
			{ heading: 'Column def', roots: [GRID_TYPE.ColumnDef], expectedCount: 3 },
			{ heading: 'State', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.LayoutComposition,
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
		page: DocPage.EditingDeleting,
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
		page: DocPage.LayoutFooter,
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
		page: DocPage.LayoutIndex,
		// The table sits under the page's own `# Layout` heading and names full paths
		// from the grid config (`layout.maxHeight`, `layout.stickyHeader`, `layout.stickyFooter`).
		optionTables: [{ heading: 'Layout', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 3 }],
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
		page: DocPage.ColumnsCellTypes,
		optionTables: [
			{ heading: "`'date'`", roots: [GRID_TYPE.DateCellConfig], expectedCount: 3 },
			{ heading: "`'link'`", roots: [GRID_TYPE.LinkCellConfig], expectedCount: 3 },
		],
		nonOptionTables: [
			{
				heading: 'Built-in cell types',
				reason: "First column holds `cell.type` *values* ('text', 'number', …), not keys of a config object.",
			},
		],
	},
	{
		page: DocPage.ColumnsCustomCellTypes,
		// The four renderer slots a `defineCellType` definition may carry.
		optionTables: [{ heading: 'Declaring a config', roots: [GRID_TYPE.CellTypeDefinition], expectedCount: 4 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.StateDefaults,
		optionTables: [
			// The keys a defaults layer deliberately cannot carry — real `UseDataGridConfig` keys,
			// which is exactly what makes the row meaningful.
			{ heading: 'What can be defaulted', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 },
			{ heading: 'Built-in default values', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 41 },
		],
		nonOptionTables: [{ heading: 'When to use which', reason: 'Maps a situation to an API, naming no keys.' }],
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
		page: DocPage.StateServerSide,
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
		page: DocPage.ColumnsOrdering,
		optionTables: [
			{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 1 },
			{ heading: 'Column options', roots: [GRID_TYPE.ColumnDef], expectedCount: 1 },
		],
		nonOptionTables: [],
	},
	{
		page: DocPage.Localization,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 1 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ExamplesIndex,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Where each surface comes from',
				reason:
					'Maps a rendered surface to the option that produces it — whole config expressions, not keys of one type.',
			},
		],
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
		// Prose and live examples only — its options table moved to `pinning/api.mdx`.
		page: DocPage.PinningColumns,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.ColumnsVisibility,
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
		page: DocPage.StateControlled,
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
			{ heading: '`TableOperatorsConfig`', roots: [GRID_TYPE.TableOperatorsConfig], expectedCount: 1 },
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
		page: DocPage.FilteringVariants,
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.ReactFilteringConfig], expectedCount: 3 }],
		nonOptionTables: [
			{
				heading: 'Filter Variants',
				reason:
					"First column holds `variant` *values* ('inline', 'popover', 'panel'), one row each, not keys of a config object.",
			},
		],
	},
	{
		page: DocPage.FilteringActiveFilters,
		optionTables: [
			{ heading: '`filtering`', roots: [GRID_TYPE.ReactFilteringConfig], expectedCount: 2 },
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
		optionTables: [{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 15 }],
		nonOptionTables: [
			{
				heading: 'Label',
				reason:
					'Lists the values `pagination.label` accepts (`range`, `page`, `false`, a renderer) against what each reads; the rows are values, not keys.',
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
		// The narrative half of the split: prose and live examples, every table moved to
		// `row-actions/api.mdx` below. Mapped with two empty arrays so the page stays inside
		// `everyPageIsMapped` rather than silently unchecked.
		page: DocPage.RowActionsIndex,
		optionTables: [],
		nonOptionTables: [],
	},
	{
		page: DocPage.RowActionsApi,
		optionTables: [
			{ heading: 'Options', roots: [GRID_TYPE.UseDataGridConfig], expectedCount: 4 },
			// Rows are the fields of one custom entry, not keys of the grid config. Three roots
			// because the table documents one shape a reader meets in two places: the two halves
			// of the shared `ActionItem` union — the described entry and the `component` an entry
			// that draws itself carries instead — plus `RowActionItem`, the row's own extension,
			// which is where `placement` and `width` live.
			{
				heading: 'Entry shape',
				roots: [GRID_TYPE.ActionItemDef, GRID_TYPE.ActionItemSlot, GRID_TYPE.RowActionItem],
				expectedCount: 10,
			},
			// The shared shape `selection.column` / `expanding.column` / `rowActions.column` all
			// take, documented once here and linked to from the other two pages.
			{ heading: 'The column itself', roots: [GRID_TYPE.SystemColumnDef], expectedCount: 6 },
		],
		nonOptionTables: [],
	},
	{
		// Prose and live examples only — its options table moved to `pinning/api.mdx`.
		page: DocPage.PinningRows,
		optionTables: [],
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
		page: DocPage.StateIndex,
		optionTables: [
			// One table crossing both levels on purpose: the page's whole point is
			// that a starting value can come from a column def *or* from the grid
			// config, so the column-level rows resolve against `ColumnDef` and the
			// grid-level ones against `UseDataGridConfig`.
			{
				heading: 'Precedence at a glance',
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

	{ page: DocPage.FormBasicConcepts, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormComposition, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormExamples, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormGettingStarted, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormInstallationHeroui, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormInstallationShadcn, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormReactivity, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormSelectCreatable, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormSelectIndex, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormSelectOptionSources, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormSelectSearchable, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormSubmission, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.FormValidation, optionTables: [], nonOptionTables: [] },
	// --- @ez-kit/zu-store ---------------------------------------------------
	{
		page: DocPage.ZuAi,
		optionTables: [],
		nonOptionTables: [{ heading: 'Use with AI', reason: 'Lists the llms.txt endpoints — URLs, not config keys.' }],
	},
	{
		page: DocPage.ZuCacheApi,
		optionTables: [
			{ heading: '`CacheScope`', roots: [STORE_TYPE.ZuScopeProps], expectedCount: 2 },
			{ heading: '`useCache()`', roots: [STORE_TYPE.ZuStoreCacheController], expectedCount: 2 },
			{ heading: '`options`', roots: [STORE_TYPE.ZuCachedStoreOptions], expectedCount: 2 },
			{ heading: 'The returned group', roots: [STORE_TYPE.ZuCachedStoreGroup], expectedCount: 5 },
			{ heading: '`Provider`', roots: [STORE_TYPE.ZuCachedProviderProps], expectedCount: 6 },
			{ heading: '`Subscribe`', roots: [STORE_TYPE.ZuCachedSubscribeProps], expectedCount: 3 },
			{ heading: '`createStoreCache(options?)`', roots: [STORE_TYPE.ZuStoreCacheOptions], expectedCount: 1 },
		],
		nonOptionTables: [
			{
				heading: '`CacheProvider`',
				reason: 'The default cache provider takes only `children`; its props type is internal.',
			},
			{ heading: '`useCacheKeys(prefix?)`', reason: 'Documents the hook argument, not a key of any object.' },
			{ heading: '`toTree(records)`', reason: 'Documents the function argument, not a key of any object.' },
			{ heading: '`createCachedStore(factory, options)`', reason: 'Documents the two positional arguments.' },
			{ heading: '`useSelector(selector)`', reason: 'Documents the hook argument.' },
			{ heading: '`getFromCache(target)`', reason: 'Documents the method argument.' },
			{ heading: '`useFromCache(target, selector)`', reason: 'Documents the two method arguments.' },
			{ heading: 'Types', reason: 'Lists the exported type names themselves, not keys of any of them.' },
			{ heading: 'Errors', reason: 'Lists thrown error messages.' },
		],
	},
	{ page: DocPage.ZuCacheIndex, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.ZuCapabilities,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'What ships', reason: 'Names the two shipped capability wrappers — exports, not keys.' },
		],
	},
	{
		page: DocPage.ZuCreateContextStoreApi,
		optionTables: [
			{ heading: 'The `controlled` option', roots: [STORE_TYPE.ZuControlledFieldConfig], expectedCount: 2 },
		],
		nonOptionTables: [
			{ heading: 'Signature', reason: 'Documents the two positional arguments of `createContextStore`.' },
			{
				heading: '`Provider`',
				reason: "The Provider's props type is internal to the factory result; the table documents its three props.",
			},
			{ heading: '`useSelector(selector)`', reason: 'Documents the hook argument.' },
			{ heading: '`useShallowSelector(selector)`', reason: 'Documents the hook argument.' },
			{ heading: '`Subscribe`', reason: "The render-prop component's props type is internal to the factory result." },
			{ heading: 'Exports', reason: 'Lists the exported names themselves.' },
			{ heading: 'Errors', reason: 'Lists thrown error messages.' },
		],
	},
	{
		page: DocPage.ZuCreateContextStoreIndex,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'Reading state', reason: 'Prose comparison of the read hooks; the first column names no key.' },
			{ heading: '`defaultValue` vs `value`', reason: 'Prose comparison of the two seeding props.' },
		],
	},
	{
		page: DocPage.ZuGettingStarted,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'The read/write model',
				reason: 'Prose table of read and write paths; the first column names no key.',
			},
		],
	},
	{
		page: DocPage.ZuHistory,
		optionTables: [{ heading: 'Options', roots: [STORE_TYPE.ZuHistoryOptions], expectedCount: 5 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ZuIndex,
		optionTables: [],
		nonOptionTables: [{ heading: "What's in the box", reason: 'Table of contents: page links, not config keys.' }],
	},
	{ page: DocPage.ZuPersistCache, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.ZuPersistCombined, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.ZuPersistCustomAdapter,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'Two shapes', reason: 'Compares the two adapter shapes in prose; the first column names no key.' },
		],
	},
	{ page: DocPage.ZuPersistDeepDiveStorage, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.ZuPersistDeepDiveUrl, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.ZuPersistFields,
		optionTables: [{ heading: 'Key placement', roots: [STORE_TYPE.ZuAccessorFieldOptions], expectedCount: 3 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.ZuPersistIndex,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'One engine, many sources',
				reason: 'Lists the shipped sources in prose; the first column names no key.',
			},
			{ heading: 'On this topic', reason: 'Table of contents: page links.' },
		],
	},
	{
		page: DocPage.ZuPersistParsers,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'Parsers', reason: 'Names the exported parser factories, called rather than passed as keys.' },
			{ heading: 'Auto-resolution', reason: 'Maps runtime types to parsers; the first column names TypeScript types.' },
		],
	},
	{ page: DocPage.ZuPersistQuickStartStorage, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.ZuPersistQuickStartUrl, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.ZuPersistTypescript, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.ZuUseStoreState, optionTables: [], nonOptionTables: [] },

	// --- @ez-kit/va-store ---------------------------------------------------
	{
		page: DocPage.VaAi,
		optionTables: [],
		nonOptionTables: [{ heading: 'Use with AI', reason: 'Lists the llms.txt endpoints — URLs, not config keys.' }],
	},
	{
		page: DocPage.VaCacheApi,
		optionTables: [
			{ heading: '`CacheScope`', roots: [STORE_TYPE.VaScopeProps], expectedCount: 2 },
			{ heading: '`useCache()`', roots: [STORE_TYPE.VaStoreCacheController], expectedCount: 2 },
			{ heading: '`options`', roots: [STORE_TYPE.VaCachedStoreOptions], expectedCount: 2 },
			{ heading: 'The returned group', roots: [STORE_TYPE.VaCachedStoreGroup], expectedCount: 5 },
			{ heading: '`Provider`', roots: [STORE_TYPE.VaCachedProviderProps], expectedCount: 6 },
			{ heading: '`Subscribe`', roots: [STORE_TYPE.VaCachedSubscribeProps], expectedCount: 1 },
			{ heading: '`Store`', roots: [STORE_TYPE.VaCachedStoreProps], expectedCount: 1 },
			{ heading: '`createStoreCache(options?)`', roots: [STORE_TYPE.VaStoreCacheOptions], expectedCount: 1 },
		],
		nonOptionTables: [
			{
				heading: '`CacheProvider`',
				reason: 'The default cache provider takes only `children`; its props type is internal.',
			},
			{ heading: '`useCacheKeys(prefix?)`', reason: 'Documents the hook argument, not a key of any object.' },
			{ heading: '`toTree(records)`', reason: 'Documents the function argument, not a key of any object.' },
			{ heading: '`createCachedStore(factory, options)`', reason: 'Documents the two positional arguments.' },
			{ heading: '`getFromCache(target)`', reason: 'Documents the method argument.' },
			{ heading: '`useFromCache(target, selector)`', reason: 'Documents the two method arguments.' },
			{ heading: 'Types', reason: 'Lists the exported type names themselves, not keys of any of them.' },
			{ heading: 'Errors', reason: 'Lists thrown error messages.' },
		],
	},
	{ page: DocPage.VaCacheIndex, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.VaCapabilities,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'What ships', reason: 'Names the two shipped capability wrappers — exports, not keys.' },
		],
	},
	{
		page: DocPage.VaCreateContextStoreApi,
		optionTables: [
			{ heading: '`useSnapshot(options?)`', roots: [STORE_TYPE.VaUseSnapshotOptions], expectedCount: 1 },
			{ heading: 'The `controlled` option', roots: [STORE_TYPE.VaControlledFieldConfig], expectedCount: 2 },
			{ heading: 'The `name` option', roots: [STORE_TYPE.VaCreateContextStoreOptions], expectedCount: 1 },
		],
		nonOptionTables: [
			{ heading: 'Signature', reason: 'Documents the two positional arguments of `createContextStore`.' },
			{
				heading: '`Provider`',
				reason: "The Provider's props type is internal to the factory result; the table documents its four props.",
			},
			{ heading: '`Subscribe`', reason: "The render-prop component's props type is internal to the factory result." },
			{ heading: '`Store`', reason: "The render-prop component's props type is internal to the factory result." },
			{ heading: 'Exports', reason: 'Lists the exported names themselves.' },
			{ heading: 'Errors', reason: 'Lists thrown error messages.' },
		],
	},
	{
		page: DocPage.VaCreateContextStoreIndex,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'Reading and writing',
				reason: 'Prose comparison of the read and write paths; the first column names no key.',
			},
			{ heading: '`defaultValue` vs `value`', reason: 'Prose comparison of the two seeding props.' },
		],
	},
	{
		page: DocPage.VaGettingStarted,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'The read/write model',
				reason: 'Prose table of read and write paths; the first column names no key.',
			},
		],
	},
	{
		page: DocPage.VaHistory,
		optionTables: [{ heading: 'Options', roots: [STORE_TYPE.VaHistoryOptions], expectedCount: 6 }],
		nonOptionTables: [],
	},
	{
		page: DocPage.VaIndex,
		optionTables: [],
		nonOptionTables: [
			{ heading: "What's in the box", reason: 'Table of contents: page links, not config keys.' },
			{
				heading: 'Coming from `@ez-kit/zu-store`?',
				reason: "Maps this package's hooks to the Zustand binding's; the first column names hooks.",
			},
		],
	},
	{ page: DocPage.VaPersistCache, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.VaPersistCombined, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.VaPersistCustomAdapter,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'Two shapes', reason: 'Compares the two adapter shapes in prose; the first column names no key.' },
		],
	},
	{
		page: DocPage.VaPersistDecorators,
		optionTables: [{ heading: 'Key placement', roots: [STORE_TYPE.VaPersistFieldOptions], expectedCount: 3 }],
		nonOptionTables: [],
	},
	{ page: DocPage.VaPersistDeepDiveStorage, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.VaPersistDeepDiveUrl,
		optionTables: [
			{
				heading: 'Key naming',
				roots: [STORE_TYPE.VaAccessorFieldOptions, STORE_TYPE.VaPersistFieldOptions],
				expectedCount: 3,
			},
		],
		nonOptionTables: [],
	},
	{ page: DocPage.VaPersistFields, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.VaPersistIndex,
		optionTables: [],
		nonOptionTables: [
			{
				heading: 'One engine, many sources',
				reason: 'Lists the shipped sources in prose; the first column names no key.',
			},
			{ heading: 'Two ways to declare fields', reason: 'Names the decorator and accessor call forms, not keys.' },
			{ heading: 'On this topic', reason: 'Table of contents: page links.' },
		],
	},
	{
		page: DocPage.VaPersistMigration,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'Summary', reason: 'Maps removed APIs to their replacements; the first column names old exports.' },
		],
	},
	{
		page: DocPage.VaPersistParsers,
		optionTables: [],
		nonOptionTables: [
			{ heading: 'Parsers', reason: 'Names the exported parser factories, called rather than passed as keys.' },
			{ heading: 'Auto-resolution', reason: 'Maps runtime types to parsers; the first column names TypeScript types.' },
		],
	},
	{ page: DocPage.VaPersistQuickStartStorage, optionTables: [], nonOptionTables: [] },
	{ page: DocPage.VaPersistQuickStartUrl, optionTables: [], nonOptionTables: [] },
	{
		page: DocPage.VaPersistTypescript,
		optionTables: [],
		nonOptionTables: [{ heading: 'Toolchain notes', reason: 'Lists toolchains and their decorator support.' }],
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
		page: DocPage.StateDefaults,
		heading: 'Built-in default values',
		name: 'cell.config.target',
		reason:
			'A per-column cell-type config default (`column.cell.config.target` on a `link` cell), listed on the ' +
			'defaults page because that page is the complete list of default *values* — the table is rooted at the ' +
			'grid config, and this one row belongs to a column def.',
	},
	{
		page: DocPage.StateDefaults,
		heading: 'Built-in default values',
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
	{
		page: DocPage.ZuCacheApi,
		heading: 'The returned group',
		name: 'getFromCache({ path?, id })',
		reason:
			'An imperative method, written with its call signature so the address argument is visible. The bare ' +
			'`getFromCache` key is covered by the other rows of this table.',
	},
	{
		page: DocPage.ZuCacheApi,
		heading: 'The returned group',
		name: 'useFromCache({ path?, id }, selector)',
		reason: 'A hook, written with its call signature — the two arguments are the point of the row.',
	},
	{
		page: DocPage.ZuCacheApi,
		heading: 'The returned group',
		name: 'remove({ path?, id })',
		reason: 'An imperative method, written with its call signature.',
	},
	{
		page: DocPage.VaCacheApi,
		heading: 'The returned group',
		name: 'getFromCache({ path?, id })',
		reason:
			'An imperative method, written with its call signature so the address argument is visible. The bare ' +
			'`getFromCache` key is covered by the other rows of this table.',
	},
	{
		page: DocPage.VaCacheApi,
		heading: 'The returned group',
		name: 'useFromCache({ path?, id }, selector)',
		reason: 'A hook, written with its call signature — the two arguments are the point of the row.',
	},
	{
		page: DocPage.VaCacheApi,
		heading: 'The returned group',
		name: 'remove({ path?, id })',
		reason: 'An imperative method, written with its call signature.',
	},
]
