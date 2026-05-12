// React hook
export {
	useDataGrid,
	COL_PINNING_KEY,
	COLUMN_VISIBILITY_KEY,
	EXPAND_KEY,
	FALLBACKS_KEY,
	FILTERING_VARIANT_KEY,
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
	FilteringVariant,
	LoadingFallbackConfig,
	NoResultsFallbackConfig,
	PageSizerConfig,
	NormalizedVirtualizedConfig,
	ReactExpandingConfig,
	ReactFilteringConfig,
	SelectionBarCallbackArgs,
	SelectionBarConfig,
	SelectionBarVariant,
} from './use-data-grid'

// Factory
export { createDataGrid } from './create-data-grid'
export type { CreateDataGridOptions } from './create-data-grid'

// Compound component
export { DataGrid } from './data-grid/data-grid'
export type { DataGridProps } from './data-grid/data-grid'

// Sub-components (also available as DataGrid.SelectionBar)
export { SelectionBar } from './data-grid/selection-bar'

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
	ChevronProps,
	ColPinSection,
	ColSortSection,
	ColVisibilitySection,
	SortIndicatorProps,
	ColumnMenuProps,
	ColumnMenuSections,
	ColumnVisibilityMenuProps,
	ConfirmDialogProps,
	EmptyStateProps,
	FilterPopoverProps,
	GridComponents,
	LoadingRowProps,
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
