// Core factory
export { createTable } from './create-table'

// Column helpers
export { defineColumns } from './column/define-columns'
export { mapColumns } from './column/map-columns'
export { createColumnHelper } from './column/create-column-helper'
export type { ColumnHelper } from './column/create-column-helper'

// System column IDs
export { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, ROW_PIN_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

// Types
export type {
	BadgeCellConfig,
	BadgeItem,
	BadgeVariant,
	CellDef,
	CellType,
	CellViewCtx,
	ColumnCreatingConfig,
	ColumnDef,
	ColumnEditingConfig,
	ColumnFilteringConfig,
	ColumnPinningDef,
	ColumnVisibilityDef,
	ImageCellConfig,
	InputComponentProps,
	ProgressCellConfig,
	SelectCellConfig,
	SelectItem,
} from './column/types'

export type { TableState } from '@tanstack/table-core'

export type {
	BetweenOperatorConfig,
	BetweenValue,
	ColumnOperatorsConfig,
	FilterOperatorDef,
	OperatorRegistry,
	StructuredFilterValue,
} from './features/operators'
export {
	DATE_OPERATORS,
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	NUMBER_OPERATORS,
	TEXT_OPERATORS,
	buildOperatorRegistry,
	resolveColumnOperators,
} from './features/operators'

export type { CreatingConfig, CreatingState } from './features/creating'
export type { ConfirmationOptions, DeletingConfig } from './features/deleting'
export type { EditingConfig, EditingState } from './features/editing'
export type { LoadingState } from './features/loading'

// Validation API
export {
	ValidationError,
	isValidationError,
	zodResolver,
} from './features/validation-types'

// Typed wrapper for fully-typed creating/editing namespaces
export {
	createTypedDataGrid,
} from './typed-data-grid'
export type {
	TypedCreatingApi,
	TypedCreatingState,
	TypedDataTable,
	TypedEditingApi,
	TypedEditingState,
} from './typed-data-grid'
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
} from './features/validation-types'

export type {
	ColumnResizeDirection,
	ColumnResizeMode,
	DataTable,
	ExpandingConfig,
	ExpandingVariant,
	FilteringConfig,
	PaginationConfig,
	PinningConfig,
	RowPinningConfig,
	SelectionConfig,
	SizingConfig,
	SortingConfig,
	Table,
	TableConfig,
	TableSnapshot,
	RowVirtualOptions,
	VirtualizedConfig,
} from './types'
