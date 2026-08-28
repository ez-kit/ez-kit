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
export type {
	UseDataGridConfig,
	ReactVisibilityConfig,
	EmptyFallbackConfig,
	ExpandedRowProps,
	FallbacksConfig,
	FilterChipsConfig,
	FilteringToolbarConfig,
	LoadingFallbackConfig,
	NoResultsFallbackConfig,
	ReactExpandingConfig,
	ReactFilteringConfig,
	ReactGlobalFilteringConfig,
	ReactPaginationConfig,
	ReactRowActionsConfig,
	ReactSelectionConfig,
	ReactSortingConfig,
	RowPropsResolver,
	LayoutConfig,
	SelectionBarCallbackArgs,
	SelectionBarConfig,
} from './use-data-grid'
// Resolved default option **values** — the single table the docs' "Defaults" page describes,
// and what a consumer reads to extend a default rather than restate it (e.g. appending to
// `pagination.pageSizeOptions`). Referenced by `{@link DATA_GRID_DEFAULTS…}` throughout the
// public JSDoc, which was pointing at something no consumer could import.
export { DATA_GRID_DEFAULTS, DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'

// Resolved options — what the grid decided, readable by any compound child or UI kit
export { useGridOptions } from './use-grid-options'
export type { ResolvedGridOptions } from './resolved-options'

// Grid overflow menu — one model for the column header menu and the row actions menu
export { GridMenuIcon, GridMenuVariant, toMenuSections } from './menu'
export type { GridMenuItem, GridMenuProps, GridMenuSection } from './menu'
export { buildColumnMenuSections, ColumnActionId } from './data-grid/column-menu-sections'
export type { ColumnMenuCapabilities } from './data-grid/column-menu-sections'

// Pagination footer label (shared by every UI kit — content, not styling)
export { buildPaginationLabel } from './data-grid/pagination-label'
export type { PaginationLabelInput } from './data-grid/pagination-label'

// Numbered-pagination page window (shared by every UI kit — structure, not styling)
export { buildPageWindow, PAGE_GAP, DEFAULT_PAGE_SIBLINGS, DEFAULT_PAGE_BOUNDARIES } from './data-grid/page-window'
export type { PageWindowInput, PageWindowItem } from './data-grid/page-window'

// Between-filter controller (shared by every UI kit — behaviour, not styling)
export { useBetweenValue, BetweenBranch } from './data-grid/use-between-value'
export type {
	BetweenController,
	BetweenDateController,
	BetweenNumberController,
	BetweenPresetsController,
	BetweenSliderController,
} from './data-grid/use-between-value'

// Multi-select filter trigger label (shared by every UI kit — content, not styling)
export { buildMultiSelectLabel } from './data-grid/multi-select-label'

// Infinite scroll
export { useInfiniteScroll } from './data-grid/use-infinite-scroll'
export type { InfiniteController } from './data-grid/use-infinite-scroll'

// Selector hook + store primitives
export { useDataGridSelector } from './use-data-grid-selector'
export { useDataGridState, useDataGridTable } from './data-grid/table-context'
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
export type { CreateDataGridOptions, DataGridBundle } from './create-data-grid'

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
	GridSelectionComponents,
	GridDraftComponents,
	GridRowActionsComponents,
	GridResizingComponents,
	GridVisibilityComponents,
	GridFallbackComponents,
	GridInfiniteComponents,
	GridExpandingComponents,
} from './contract'

// Compound component
export { DataGrid } from './data-grid/data-grid'
export type { DataGridProps, DataGridControlledProps, DataGridUncontrolledProps } from './data-grid/data-grid'
export type { DataGridTableProps, DataGridTableRenderArgs } from './data-grid/table'
export type { DataGridBodyProps, DataGridBodyRenderArgs } from './data-grid/body'
export type { DataGridHeaderProps, DataGridHeaderRenderArgs } from './data-grid/header'
export type { DataGridHeaderRowProps, DataGridHeaderRowRenderArgs } from './data-grid/header-row'
export type { DataGridHeaderCellProps, DataGridHeaderCellRenderArgs } from './data-grid/header-cell'
export type { DataGridFooterProps, DataGridFooterRenderArgs } from './data-grid/footer'
export type { DataGridRowProps, DataGridRowRenderArgs } from './data-grid/row'
export type { DataGridCellProps, DataGridCellRenderArgs } from './data-grid/cell'
export type { DataGridPaginationProps, DataGridPaginationRenderArgs } from './data-grid/pagination'
export type { DataGridSelectionBarProps, DataGridSelectionBarRenderArgs } from './data-grid/selection-bar'
export type { DataGridSortTriggerProps, DataGridSortTriggerRenderArgs } from './data-grid/sort-trigger'
export type {
	DataGridVisibilityTriggerProps,
	DataGridVisibilityTriggerRenderArgs,
} from './data-grid/visibility-trigger'
export type {
	DataGridFilterPanelColumn,
	DataGridFilterPanelProps,
	DataGridFilterPanelRenderArgs,
} from './data-grid/filter-panel'
export type { DataGridToolbarProps } from './data-grid/toolbar'
export type { DataGridActiveFiltersBarProps } from './data-grid/active-filters-bar'
export type { DataGridClearFiltersButtonProps } from './data-grid/clear-filters-button'
export type { DataGridCreateTriggerProps } from './data-grid/create-trigger'
export type { DataGridGlobalFilterInputProps } from './data-grid/global-filter-input'

// Sub-components (also available as DataGrid.SelectionBar)
export { SelectionBar } from './data-grid/selection-bar'
export { DraftBar } from './data-grid/draft-bar'
export { ActiveFiltersBar } from './data-grid/active-filters-bar'
export { ClearFiltersButton } from './data-grid/clear-filters-button'

// DI context
export { GridComponentsProvider, useGridComponents } from './components-context'

// Cell type registry
export { CellTypesProvider, defineCellType, useCellTypes } from './cell-types-context'
export type { CellTypeDefinition, CellTypeRegistry, CellViewProps, CellInputProps } from './cell-types-context'

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

// UI-kit component contracts
export type {
	ActionsCellProps,
	FormShellProps,
	BetweenInputProps,
	ChevronProps,
	SortIndicatorProps,
	VisibilityMenuProps,
	ClearFiltersButtonComponentProps,
	ConfirmDialogProps,
	DraftBarProps,
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
	SelectionBarProps,
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
	ToolbarProps,
	TrProps,
} from './types'

// Closed sets that a kit or a call site names. Each is a `const` object plus a same-named
// string union, so `ActionsCellState.Idle` and the bare `'idle'` are both valid and no consumer
// has to import anything to write an option value.
export {
	FilterChipKind,
	FilterChipsPosition,
	FilteringVariant,
	LoadMoreTrigger,
	PaginationVariant,
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
	ColumnPinningState,
	ColumnSizingState,
	ExpandedState,
	PaginationState,
	RowPinningState,
	RowSelectionState,
	VisibilityState,
} from '@tanstack/table-core'
