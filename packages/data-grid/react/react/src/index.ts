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
	PageSizerConfig,
	NormalizedVirtualizedConfig,
	ReactExpandingConfig,
	ReactFilteringConfig,
	ReactGlobalFilteringConfig,
	SelectionBarCallbackArgs,
	SelectionBarConfig,
	SelectionBarVariant,
} from './use-data-grid'

// Selector hook + store primitives
export { useDataGridSelector } from './use-data-grid-selector'
export { useDataGridInstance, useDataGridStore, useTable } from './data-grid/table-context'
export { createDataGridInstance } from './data-grid-instance'
export type { DataGridInstance } from './data-grid-instance'
export type { TableStore } from './store/table-store'
export { shallow } from './utils/shallow-equal'

// Factory
export { createDataGrid } from './create-data-grid'
export type { CreateDataGridOptions } from './create-data-grid'

// Compound component
export { DataGrid } from './data-grid/data-grid'
export type { DataGridProps } from './data-grid/data-grid'

// Sub-components (also available as DataGrid.SelectionBar)
export { SelectionBar } from './data-grid/selection-bar'
export { ActiveFiltersBar } from './data-grid/active-filters-bar'
export { ClearFiltersButton } from './data-grid/clear-filters-button'

// DI context
export { GridComponentsProvider, defaultComponents, useGridComponents } from './components-context'

// Cell type registry
export { CellTypesProvider, useCellTypes } from './cell-types-context'
export type { CellTypeDefinition, CellTypeRegistry, CellViewProps, CellInputProps } from './cell-types-context'

// Utilities
export { getCommonPinStyles } from './utils/pin-styles'
export { getColumnSizeVars } from './utils/column-size-vars'

// Validation API (re-export from core for convenience)
export {
	ValidationError,
	isValidationError,
	zodResolver,
} from '@ez-kit/data-grid-core'
export type {
	CommitStatus,
	FieldState,
	SaveContext,
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
	GridComponents,
	LoadingRowProps,
	MultiSelectFilterProps,
	MultiSelectOption,
	NoResultsStateProps,
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
