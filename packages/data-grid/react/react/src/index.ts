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
	GLOBAL_FILTERING_KEY,
	INFINITE_KEY,
	PAGE_SIZER_KEY,
	ROW_PINNING_KEY,
	SELECTION_BAR_KEY,
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
	PageSizerConfig,
	NormalizedVirtualizedConfig,
	ReactExpandingConfig,
	ReactFilteringConfig,
	ReactGlobalFilteringConfig,
	ReactPaginationConfig,
	SelectionBarCallbackArgs,
	SelectionBarConfig,
	SelectionBarVariant,
} from './use-data-grid'

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
	GridPinningComponents,
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
	CreatingActionsCellProps,
	FormShellProps,
	BetweenInputProps,
	DateRangePreset,
	ChevronProps,
	ColPinSection,
	ColSortSection,
	ColVisibilitySection,
	SortIndicatorProps,
	ColumnMenuProps,
	ColumnMenuSections,
	ColumnVisibilityMenuProps,
	ClearFiltersButtonComponentProps,
	ConfirmDialogProps,
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
	RowPinMenuProps,
	SelectionBarProps,
	SortColumnOption,
	SortDirection,
	SortMenuItem,
	SortMenuProps,
	VisibilityColumnItem,
} from './types'
export type {
	ButtonProps,
	CheckboxProps,
	InputProps,
	ModalProps,
	NumberInputProps,
	PageSizerProps,
	PaginationProps,
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

export { defineColumns, createTable, createColumnHelper } from '@ez-kit/data-grid-core'
export type { ColumnHelper } from '@ez-kit/data-grid-core'

// TanStack state types used when typing manual server-side `onChange` handlers
// (sorting/filtering/pagination). Re-exported so consumers depend only on the
// public surface instead of reaching into `@tanstack/table-core` directly.
export type { SortingState, ColumnFiltersState, PaginationState } from '@tanstack/table-core'
