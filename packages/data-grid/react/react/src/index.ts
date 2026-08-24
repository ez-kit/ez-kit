// React hook
export {
	useDataGrid,
	COL_PINNING_KEY,
	COLUMN_VISIBILITY_KEY,
	EXPAND_KEY,
	FALLBACKS_KEY,
	FILTER_CHIPS_KEY,
	FILTER_CLEAR_BUTTON_KEY,
	FILTERING_VARIANT_KEY,
	FILTERING_DEBOUNCE_KEY,
	DEFAULT_FILTER_DEBOUNCE_MS,
	GLOBAL_FILTERING_KEY,
	INFINITE_KEY,
	PAGE_SIZER_KEY,
	PAGINATION_VARIANT_KEY,
	PAGINATION_WINDOW_KEY,
	SORTING_KEY,
	VIRTUALIZED_KEY,
} from './use-data-grid'
export type {
	UseDataGridConfig,
	ColumnVisibilityUIConfig,
	EmptyFallbackConfig,
	ExpandedRowProps,
	FallbacksConfig,
	FilterChipsConfig,
	FilterChipsPosition,
	FilterClearButtonConfig,
	FilteringVariant,
	LoadingFallbackConfig,
	NoResultsFallbackConfig,
	NormalizedClearButtonConfig,
	NormalizedFilterChipsConfig,
	NormalizedGlobalFilteringConfig,
	NormalizedInfiniteConfig,
	NormalizedPageWindowConfig,
	NormalizedVirtualizedConfig,
	ReactExpandingConfig,
	ReactFilteringConfig,
	ReactGlobalFilteringConfig,
	ReactPaginationConfig,
	ReactSelectionConfig,
	SelectionPanelCallbackArgs,
	SelectionPanelConfig,
	SelectionPanelVariant,
} from './use-data-grid'

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
export { useDataGridInstance, useDataGridStore, useTable } from './data-grid/table-context'
export { createDataGridInstance } from './data-grid-instance'
export type { DataGridInstance } from './data-grid-instance'
export type { TableStore } from './store/table-store'
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
	GridColumnVisibilityComponents,
	GridFallbackStateComponents,
	GridInfiniteComponents,
	GridExpandingComponents,
} from './contract'

// Compound component
export { DataGrid } from './data-grid/data-grid'
export type { DataGridProps, DataGridControlledProps, DataGridUncontrolledProps } from './data-grid/data-grid'

// Sub-components (also available as DataGrid.SelectionBar)
export { SelectionBar } from './data-grid/selection-bar'
export { DraftBar } from './data-grid/draft-bar'
export { ActiveFiltersBar } from './data-grid/active-filters-bar'
export { ClearFiltersButton } from './data-grid/clear-filters-button'

// DI context
export { GridComponentsProvider, defaultComponents, useGridComponents } from './components-context'

// Cell type registry
export { CellTypesProvider, useCellTypes } from './cell-types-context'
export type { CellTypeDefinition, CellTypeRegistry, CellViewProps, CellInputProps } from './cell-types-context'

// Default options (app-level provider + kit-level factory `defaultOptions`)
export { DataGridOptionsProvider, useDataGridOptions } from './data-grid-options-context'
export type { DataGridDefaultOptions, DataGridOptionsProviderProps } from './data-grid-options-context'

// Utilities
export { getCommonPinStyles } from './utils/pin-styles'
export { getColumnSizeVars } from './utils/column-size-vars'

// Validation API (re-export from core for convenience)
export { ValidationError, isValidationError, zodResolver } from '@ez-kit/data-grid-core'
export type {
	CommitStatus,
	CreatingSaveContext,
	EditingSaveContext,
	FieldState,
	ValidateConfig,
	ValidateContext,
	ValidateOn,
	ValidationErrors,
	ValidationProblems,
	ValidationResult,
} from '@ez-kit/data-grid-core'

// Types
export type {
	ActionsCellProps,
	FormShellProps,
	BetweenInputProps,
	DateRangePreset,
	ChevronProps,
	SortIndicatorProps,
	ColumnVisibilityMenuProps,
	ClearFiltersButtonComponentProps,
	ConfirmDialogProps,
	DraftBarProps,
	EmptyStateProps,
	FilterChipKind,
	FilterChipProps,
	FilterPanelChipProps,
	FilterPanelProps,
	FilterPopoverProps,
	GlobalFilterInputProps,
	GridComponentRegistry,
	LoadingRowProps,
	LoadMoreRowProps,
	MultiSelectFilterProps,
	MultiSelectOption,
	NoResultsStateProps,
	RefetchOverlayProps,
	OperatorSelectProps,
	ResizerProps,
	SelectionBarProps,
	SortColumnOption,
	SortDirection,
	SortMenuItem,
	SortMenuProps,
	VisibilityColumnItem,
} from './types'
// `PaginationVariants` is a const object (runtime value) — exported as a value, not a type.
// Optional sugar: `pagination.variant` accepts the plain `PaginationVariant` string union.
export { PaginationVariants } from './types'
// Enums (runtime values). `RowActionId` names the row entries the grid can offer;
// `RowActionsMode` is the discriminant a kit switches on inside `ActionsCell`.
export { RowActionId, RowActionsMode } from './types'
export type {
	ButtonProps,
	CheckboxProps,
	InputProps,
	ModalProps,
	NumberInputProps,
	PageSizerProps,
	PaginationProps,
	PaginationVariant,
	TbodyProps,
	TdProps,
	ThProps,
	TheadProps,
	TableProps,
	ToolbarProps,
	TrProps,
} from './types'

// Re-export core types for convenience
export type {
	BetweenOperatorConfig,
	BetweenValue,
	ColumnOperatorsConfig,
	FilterOperatorDef,
	GlobalFilterFn,
	GlobalFilteringConfig,
	OperatorRegistry,
	StructuredFilterValue,
	TableState,
} from '@ez-kit/data-grid-core'

export type {
	BadgeCellConfig,
	BadgeItem,
	BadgeVariant,
	ColumnDef,
	ColumnPinningDef,
	ColumnResizeDirection,
	ColumnResizeMode,
	ColumnVisibilityDef,
	CreatingConfig,
	DataTable,
	ConfirmationOptions,
	DateCellConfig,
	DeletingConfig,
	DeletingContext,
	EditingConfig,
	ImageCellConfig,
	PinningConfig,
	ProgressCellConfig,
	RowPinningConfig,
	RowVirtualOptions,
	SelectCellConfig,
	SelectItem,
	SizingConfig,
	Table,
	TableConfig,
	TableSnapshot,
	VirtualizedConfig,
} from '@ez-kit/data-grid-core'

export { createColumns, createTable, createColumnHelper } from '@ez-kit/data-grid-core'
export type { ColumnHelper } from '@ez-kit/data-grid-core'

// TanStack state types used when typing manual server-side `onChange` handlers
// (sorting/filtering/pagination). Re-exported so consumers depend only on the
// public surface instead of reaching into `@tanstack/table-core` directly.
export type { SortingState, ColumnFiltersState, PaginationState } from '@tanstack/table-core'
