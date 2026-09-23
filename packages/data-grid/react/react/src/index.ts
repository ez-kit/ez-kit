'use client'

/**
 * Public surface of `@ez-kit/data-grid-react`.
 *
 * The **whole** headless surface is re-exported from `@ez-kit/data-grid-core` below, so a
 * consumer — and a UI kit that re-exports this module — never needs `@ez-kit/data-grid-core`
 * as a second dependency to name a type. Anything this layer supersedes (`sorting`,
 * `filtering`, `pagination`, … configs that gain React-only UI fields) is exported here under
 * a `React*` name and the headless original stays available alongside it.
 *
 * Internal plumbing is deliberately **not** exported: the `Symbol()` keys used to carry
 * normalized config on the table instance are an implementation detail of this package, and
 * nothing outside it may depend on them.
 */

// ── headless core, in full ────────────────────────────────────────────────
// A single star re-export rather than a hand-maintained list: the previous list had drifted
// to the point where 50 core exports — `CellType`, `ColumnSortingConfig`, `RowActionsConfig`,
// `LoadingState`, `ACTIONS_COLUMN_ID`, … — were unreachable from this package, and therefore
// from every UI kit built on it.
export * from '@ez-kit/data-grid-core'

// ── React-bound column types ──────────────────────────────────────────────
// These shadow the star-exported core names on purpose: an explicit re-export wins over a star
// of the same name, so `ColumnDef` / `createColumns` / `createColumnHelper` reached from this
// package are the ones whose renderer slots return `ReactNode`.
export { createColumns, createColumnHelper } from './react-columns'
export type { ColumnDef, CellDef, ColumnHelper } from './react-columns'

// React hook
export { useDataGrid } from './use-data-grid'
/**
 * `useDataGrid`'s return type — **this package's** `DataTable`, not core's.
 *
 * An explicit re-export shadows the same name from the `export * from '@ez-kit/data-grid-core'`
 * above, exactly as `ColumnDef` / `createColumns` / `createColumnHelper` already do, and that is
 * the point: the two are no longer the same type. Task 14 gave the React table
 * `grid: ResolvedGridOptions` in place of core's `grid: GridOptions`, so a consumer who wrote
 * `DataTable<Features, Invoice>` against this entry point and got core's would be holding a type
 * that describes `table.grid` wrongly and does not declare `table.gridContext` at all.
 */
export type { DataTable } from './types'
export type {
	UseDataGridConfig,
	EmptyFallbackConfig,
	ExpandedRowProps,
	FallbacksConfig,
	LoadingFallbackConfig,
	NoResultsFallbackConfig,
	// The resolved shapes `ResolvedGridOptions` is built from. That type is public and a UI kit
	// reads it through `useGridOptions()`, so the names of its members have to be nameable too —
	// they were not, and a kit lifting `grid.globalFiltering` into a helper had no type to write.
	NormalizedFallbackConfig,
	NormalizedFallbacksConfig,
	NormalizedGlobalFilteringConfig,
	NormalizedInfiniteConfig,
	NormalizedSelectionBarConfig,
	NormalizedVirtualizationConfig,
	ReactExpandingConfig,
	ReactFilteringConfig,
	ReactGlobalFilteringConfig,
	ReactPaginationConfig,
	ReactRowActionsConfig,
	ReactSelectionConfig,
	RowPropsResolver,
	LayoutClassNames,
	LayoutConfig,
	SelectionBarCallbackArgs,
	SelectionBarConfig,
} from './use-data-grid'
// Resolved default option **values** — the single table the docs' "Defaults" page describes,
// and what a consumer reads to extend a default rather than restate it (e.g. appending to
// `pagination.items`). Referenced by `{@link DATA_GRID_DEFAULTS…}` throughout the
// public JSDoc, which was pointing at something no consumer could import.
export { DATA_GRID_DEFAULTS, DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'

// Grid context — what the application and the kit decided, carried alongside the grid.
// The interface ships empty and is extended by declaration merging; the atom type is exported
// because `table.gridContext` names it, so a consumer reaching the table has to be able to
// name it too.
export { useGridContext } from './grid-context'
export type { GridContext, GridContextAtom } from './grid-context'

// Resolved options — what the grid decided, readable by any compound child or UI kit
export { useGridOptions } from './use-grid-options'
export { useGridMessages } from './use-grid-messages'
export type { ResolvedGridOptions } from './resolved-options'

// The dictionary, re-exported from core so a UI kit reading `useGridOptions().messages` can
// name its type without depending on core directly.
export type {
	CountContext,
	DraftSummaryContext,
	FilterPlaceholderContext,
	GridMessages,
	PartialGridMessages,
} from '@ez-kit/data-grid-core'

// Grid overflow menu — one model for the column header menu and the row actions menu
export { GridMenuIcon, GridMenuVariant, isGridMenuItemSlot, toMenuSections } from './menu'
export type { GridMenuItem, GridMenuItemDef, GridMenuItemSlot, GridMenuProps, GridMenuSection } from './menu'
export { buildColumnMenuSections, ColumnActionId } from './data-grid/column-menu-sections'
export type { ColumnMenuCapabilities } from './data-grid/column-menu-sections'

// Pagination footer label (shared by every UI kit — content, not styling)
export { buildPaginationLabel } from './data-grid/pagination-label'
export type { PaginationLabelModel } from './data-grid/pagination-label'

// Numbered-pagination page window (shared by every UI kit — structure, not styling)
export { buildPageWindow, PAGE_GAP, DEFAULT_PAGE_SIBLINGS, DEFAULT_PAGE_BOUNDARIES } from './data-grid/page-window'
export type { PageWindowInput, PageWindowItem } from './data-grid/page-window'

// Between-filter controller (shared by every UI kit — behaviour, not styling)
export { useBetweenValue, BetweenBranch } from './data-grid/use-between-value'
export type { BetweenController, BetweenNumberController, BetweenSliderController } from './data-grid/use-between-value'

// Multi-select filter trigger label (shared by every UI kit — content, not styling)
export { buildMultiSelectLabel } from './data-grid/multi-select-label'

// Infinite scroll
export { useInfiniteScroll } from './data-grid/use-infinite-scroll'
export type { InfiniteController } from './data-grid/use-infinite-scroll'

// Selector hook + store primitives
export { useDataGridSelector } from './use-data-grid-selector'
export { useDataGridState, useDataGridTable } from './data-grid/table-context'
export { useDataGridCell, useDataGridHeaderCell, useDataGridRow } from './data-grid/composition-context'
export { prepareDataGridTable } from './prepare-table'
export { shallow } from './utils/shallow-equal'

// State persistence (Layer 1 utilities + Layer 2 reactive hook)
export { extractState } from './state/extract-state'
export { parseState } from './state/parse-state'
export { useExtractedState } from './state/use-extracted-state'
export { PERSISTABLE_STATE_KEYS, DEFAULT_STATE_KEYS } from './state/state-keys'
export type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state/state-keys'

// Factory
export { createDataGrid } from './create-data-grid'
export type {
	BoundDataGrid,
	BoundDataGridProps,
	BoundUseDataGridConfig,
	CreateDataGridOptions,
	DataGridBundle,
} from './create-data-grid'

// UI-kit contract (tiers + full-support marker + feature map)
export { GridFeature, FEATURE_COMPONENTS, COMPONENT_FEATURE } from './contract'
export type {
	GridComponents,
	FullGridComponents,
	GridCoreComponents,
	GridPaginationComponents,
	GridSortingComponents,
	GridFilteringComponents,
	GridEditingComponents,
	GridDeletingComponents,
	GridRowActionsComponents,
	GridResizingComponents,
	GridVisibilityComponents,
	GridFallbackComponents,
	GridInfiniteComponents,
	GridExpandingComponents,
} from './contract'

// Compound component
export { DataGrid } from './data-grid/data-grid'

/**
 * The same components, one by one — `DataGrid.X` is an alias for these, not the only door to them.
 *
 * The compound is assembled by a single annotated `Object.assign` over a flat literal, so a
 * bundler keeps every member the moment anything names `DataGrid`: that is what the namespace
 * *is*, and it is priced accordingly. Naming a component instead keeps that component, and a grid
 * composed out of the ones it renders is a fraction of the compound. Adding this block cost the
 * whole surface only these `export` lines.
 *
 * Read the saving as the components' share, not the grid's: {@link DataGridRoot} renders
 * `children ?? core.Layout ?? <DataGridTable/>`, so any grid reaches the table chain through the
 * root whichever door it used, and the shared floor (context, `useDataGridTable`) is paid once
 * either way. `apps/docs/test/tree-shaking.test.ts` is where this is measured.
 *
 * This is **not** the alternative AGENTS.md records as rejected. That one *moved* `DataGrid.X`
 * onto a subpath, costing a major and every existing call site for the same bytes. Here the
 * compound stays exactly where it is and the names are added beside it, so nothing written
 * against this package changes.
 *
 * The names carry the `DataGrid` prefix while the compound's keys stay short, which is the shape
 * `@heroui/react` settled on for its own table (`TableBody` beside `Table.Body`) and for the same
 * reason: `Body`, `Row`, `Cell` and `Header` are too general to sit in a package root next to
 * `createColumns` and `createDataGrid`. It also finishes a split this package already had —
 * `DataGridRow` and `DataGridCell` were prefixed, `Body` and `Header` were not, and every
 * `DataGrid*Props` type was.
 *
 * {@link DataGridRoot} is the bare root, without the statics: rendering `<DataGrid>` to host
 * named children would pull the namespace back in and hand back the saving. Its type is the plain
 * component, so `DataGridRoot.Footer` does not type-check even though the two are one object at
 * runtime.
 */
export { DataGridRoot } from './data-grid/data-grid'
export { Toolbar as DataGridToolbar } from './data-grid/toolbar'
export { DataGridTable } from './data-grid/table'
export { Header as DataGridHeader } from './data-grid/header'
export { DataGridHeaderRow } from './data-grid/header-row'
export { DataGridHeaderCell } from './data-grid/header-cell'
export { HeaderMain as DataGridHeaderMain, HeaderExtras as DataGridHeaderExtras } from './data-grid/header-slots'
export { Body as DataGridBody } from './data-grid/body'
export { DataGridRow } from './data-grid/row'
export { DataGridCell } from './data-grid/cell'
export { Footer as DataGridFooter } from './data-grid/footer'
export { DataGridFooterRow } from './data-grid/footer-row'
export { DataGridFooterCell } from './data-grid/footer-cell'
export { Pagination as DataGridPagination } from './data-grid/pagination'
export { PageSizer as DataGridPageSizer } from './data-grid/page-sizer'
export { BottomBar as DataGridBottomBar } from './data-grid/bottom-bar'
export { ColumnFilter as DataGridColumnFilter } from './data-grid/column-filter'
export { ActionBar as DataGridActionBar } from './data-grid/action-bar'
export { CreateTrigger as DataGridCreateTrigger } from './data-grid/create-trigger'
export { VisibilityTrigger as DataGridVisibilityTrigger } from './data-grid/visibility-trigger'
export { SortMenuTrigger as DataGridSortMenuTrigger } from './data-grid/sort-menu-trigger'
export { GlobalFilterInput as DataGridGlobalFilterInput } from './data-grid/global-filter-input'
export { ActiveFiltersBar as DataGridActiveFiltersBar } from './data-grid/active-filters-bar'
export { ClearFiltersButton as DataGridClearFiltersButton } from './data-grid/clear-filters-button'
export { FilterPanel as DataGridFilterPanel } from './data-grid/filter-panel'
export { CreatingModal as DataGridCreatingModal } from './data-grid/creating-modal'
export { EditingModal as DataGridEditingModal } from './data-grid/editing-modal'
export { LoadingBody as DataGridLoadingBody } from './data-grid/loading-body'
export { EmptyStateRow as DataGridEmptyStateRow } from './data-grid/empty-state-row'
export { NoResultsRow as DataGridNoResultsRow } from './data-grid/no-results-row'
export type {
	DataGridProps,
	DataGridControlledProps,
	DataGridSharedProps,
	DataGridStatics,
	DataGridUncontrolledProps,
} from './data-grid/data-grid'
export type { DataGridTableProps, DataGridTableRenderArgs } from './data-grid/table'
export type { DataGridBodyProps, DataGridBodyRenderArgs } from './data-grid/body'
export type { DataGridHeaderProps, DataGridHeaderRenderArgs } from './data-grid/header'
export type { DataGridHeaderRowProps, DataGridHeaderRowRenderArgs } from './data-grid/header-row'
export type { DataGridHeaderCellProps, DataGridHeaderCellRenderArgs } from './data-grid/header-cell'
export type { DataGridFooterProps, DataGridFooterRenderArgs } from './data-grid/footer'
export type { DataGridFooterRowProps, DataGridFooterRowRenderArgs } from './data-grid/footer-row'
export type { DataGridFooterCellProps, DataGridFooterCellRenderArgs } from './data-grid/footer-cell'
export type { DataGridRowProps, DataGridRowRenderArgs } from './data-grid/row'
export type { DataGridCellProps, DataGridCellRenderArgs } from './data-grid/cell'
export type { DataGridPaginationProps, DataGridPaginationRenderArgs } from './data-grid/pagination'
export type { DataGridSortMenuTriggerProps, DataGridSortMenuTriggerRenderArgs } from './data-grid/sort-menu-trigger'
export type {
	DataGridVisibilityTriggerProps,
	DataGridVisibilityTriggerRenderArgs,
} from './data-grid/visibility-trigger'
export type {
	DataGridFilterPanelColumn,
	DataGridFilterPanelProps,
	DataGridFilterPanelRenderArgs,
} from './data-grid/filter-panel'
export type { DataGridColumnFilterProps } from './data-grid/column-filter'
export type { DataGridPageSizerProps, DataGridPageSizerRenderArgs } from './data-grid/page-sizer'
export type { DataGridBottomBarProps } from './data-grid/bottom-bar'
export type { DataGridActionBarProps, DataGridActionBarRenderArgs } from './data-grid/action-bar'
export type { DataGridFormModalProps, DataGridFormModalRenderArgs } from './data-grid/form-modal'
export type { DataGridCreatingModalProps } from './data-grid/creating-modal'
export type { DataGridEditingModalProps } from './data-grid/editing-modal'
export type { DataGridLoadingBodyProps, DataGridLoadingBodyRenderArgs } from './data-grid/loading-body'
export type { DataGridEmptyStateRowProps, DataGridEmptyStateRowRenderArgs } from './data-grid/empty-state-row'
export type { DataGridNoResultsRowProps, DataGridNoResultsRowRenderArgs } from './data-grid/no-results-row'
export type { DataGridToolbarProps } from './data-grid/toolbar'
export type { DataGridActiveFiltersBarProps } from './data-grid/active-filters-bar'
export type { DataGridClearFiltersButtonProps } from './data-grid/clear-filters-button'
export type { DataGridCreateTriggerProps } from './data-grid/create-trigger'
export type { DataGridGlobalFilterInputProps } from './data-grid/global-filter-input'

// Sub-components (also available as DataGrid.ActionBar)
export { ActionBar } from './data-grid/action-bar'
export { ActiveFiltersBar } from './data-grid/active-filters-bar'
export { ClearFiltersButton } from './data-grid/clear-filters-button'

// Layout presets for `core.Layout` — what a UI kit binds so its prebuilt `<DataGrid>` renders
// a full shell, and what an application starts from when composing its own. Pure composition;
// see `./layouts` for why there are four of them.
export { BottomBarLayout, DefaultLayout, FilterPanelLayout, PopoverFiltersLayout } from './layouts'

// DI context
export { GridComponentsProvider, useGridComponents } from './components-context'
export type { GridComponentsProviderProps } from './components-context'

// Cell type registry
export { CellTypesProvider, defineCellType, useCellTypes } from './cell-types-context'
export type { CellTypeDefinition, CellTypeRegistry, CellTypesProviderProps, CellViewProps } from './cell-types-context'

// The nine base cell types a kit extends, and the two formatters their renderers use.
//
// Previously a `./cell-types` sub-export. Folded into the root so there is one entry point
// and one import path: a kit already imports this module for `defineCellType` and the DI
// primitives, so reaching the base it extends through a second specifier bought nothing but
// a second thing to know about. The package is `sideEffects`-free, so a consumer that never
// names `baseCellTypes` still does not ship it.
export { baseCellTypes, booleanCellType, formatNumber, numberCellType, textCellType, truncateText } from './cell-types'

// Default options (app-level provider + kit-level factory `defaults`)
export { DataGridOptionsProvider, useDataGridOptions } from './data-grid-options-context'
export type { DataGridDefaultOptions, DataGridOptionsProviderProps } from './data-grid-options-context'

// Utilities
export { getCommonPinStyles } from './utils/pin-styles'
export { getColumnSizeVars } from './utils/column-size-vars'
export { getVisualLeafColumns } from './utils/visual-column-order'

// UI-kit component contracts
export type {
	/**
	 * The feature set every component below `<DataGrid>` is typed against — a UI kit writing a
	 * component that receives a table names this, not a set of its own.
	 */
	GridFeatures,
	ActionsCellProps,
	FormShellProps,
	BetweenInputProps,
	ChevronProps,
	SortIndicatorProps,
	VisibilityMenuProps,
	ClearFilterButtonProps,
	ConfirmDialogProps,
	ActionBarProps,
	ActionBarSelectionSection,
	ActionBarDraftSection,
	EmptyStateProps,
	FilterChipProps,
	FilterPanelChipProps,
	FilterPanelProps,
	FilterPopoverProps,
	GlobalFilterInputProps,
	GridComponentRegistry,
	LoadingRowProps,
	LoadMoreRowProps,
	LoadMoreThreshold,
	MultiSelectFilterProps,
	NoResultsStateProps,
	RefetchOverlayProps,
	OperatorSelectProps,
	ResizerProps,
	SortColumnOption,
	SortMenuItem,
	SortMenuProps,
	VisibilityColumnItem,
	ButtonProps,
	CheckboxProps,
	InputProps,
	ModalProps,
	NumberInputProps,
	PageSizerProps,
	PaginationProps,
	TbodyProps,
	TfootProps,
	TdProps,
	ThProps,
	TheadProps,
	TableProps,
	LayoutProps,
	RootProps,
	TableScrollProps,
	TableWrapperProps,
	HeaderMainProps,
	HeaderExtrasProps,
	ToolbarProps,
	TooltipProps,
	TrProps,
} from './types'

// Closed sets that a kit or a call site names. Each is a `const` object plus a same-named
// string union, so `ActionsCellState.Idle` and the bare `'idle'` are both valid and no consumer
// has to import anything to write an option value.
export {
	FilterChipKind,
	FilterChipsPosition,
	LoadMoreTrigger,
	PaginationLabel,
	RowActionId,
	ActionsCellState,
	ColumnSortDirection,
	ActionBarVariant,
	SortDirection,
} from './types'

// TanStack state slice types. Every feature's `onChange` is typed with one of these, so a
// consumer that lifts a handler out of the JSX must be able to name it — without adding
// `@tanstack/table-core` as a second dependency, which is exactly what this package (and each
// UI kit re-exporting it) promises they never need. `SortingState` is not re-exported here —
// the core one (`SortingStateEntry[]`) arrives via the star export above and is structurally
// identical.
export type {
	ColumnFiltersState,
	// `ordering.column.onChange` is typed with it, so a consumer lifting that handler out of the
	// JSX has to be able to name it without depending on `@tanstack/table-core`.
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	// v9's spelling of v8's `VisibilityState`, and the one `visibility.onChange` is typed with
	// since core moved (`core/src/types.ts`). The old name is not re-exported as an alias: it
	// would be this package's own invention rather than a name TanStack still has, and the
	// migration is one word at the consumer's import.
	ColumnVisibilityState,
	ExpandedState,
	PaginationState,
	RowPinningState,
	RowSelectionState,
} from '@tanstack/table-core'
