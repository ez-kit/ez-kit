// Core factory
export { createTable } from './create-table'

// Default option values (single source; referenced by the React adapter + UI kits)
export { DEFAULT_PAGE_SIZE, UNKNOWN_PAGE_COUNT } from './defaults'

// Feature-toggle contract shared by every feature option
export { featureConfig, isFeatureEnabled } from './utils/feature-flag'
export type { FeatureOption, FeatureToggle } from './utils/feature-flag'

// Column helpers
export { createColumns } from './column/create-columns'
export { mapColumns } from './column/map-columns'
export { createColumnHelper } from './column/create-column-helper'
export { BASE_CELL_TYPE_IDS, ColumnAlign, ColumnPinSide } from './column/types'
export type { ColumnHelper } from './column/create-column-helper'

// System column IDs
export { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

// Row actions (edit / delete / row-pin menu share the `__actions__` column)
export { RowActionsVariant } from './features/row-actions'
export type { RowActionsConfig } from './features/row-actions'

// Types
export type {
	BadgeCellConfig,
	BadgeItem,
	BadgeVariant,
	BuiltInSortingFn,
	BaseCellTypes,
	BooleanCellConfig,
	CellDef,
	CellTypeRegistryShape,
	ConfigOf,
	BuiltInCellType,
	CellType,
	NumberCellConfig,
	TextCellConfig,
	CellViewCtx,
	ColumnCreatingConfig,
	ColumnDef,
	ColumnEditingConfig,
	ColumnFilteringConfig,
	ColumnAlignDef,
	ColumnPinningDef,
	ColumnWidthDef,
	ColumnSortUndefined,
	ColumnSortingConfig,
	ColumnVisibilityDef,
	DateCellConfig,
	ImageCellConfig,
	InputComponentProps,
	ProgressCellConfig,
	SelectCellConfig,
	SelectItem,
	SortingFn,
} from './column/types'

export type { TableState } from '@tanstack/table-core'

export type {
	BetweenOperatorConfig,
	BetweenValue,
	ColumnOperatorsConfig,
	DateRangePreset,
	FilterOperatorDef,
	MultiSelectOption,
	OperatorRegistry,
	StructuredFilterValue,
} from './features/operators'
export {
	DATE_OPERATORS,
	DATE_RANGE_PRESETS,
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	IN_OPERATORS,
	NUMBER_OPERATORS,
	TEXT_OPERATORS,
	buildOperatorRegistry,
	resolveColumnOperators,
} from './features/operators'

export { CreatingMode } from './features/creating'
export type {
	CreateDefaultValueContext,
	CreateDefaultValuesContext,
	CreatingConfig,
	CreatingSaveContext,
	CreatingState,
} from './features/creating'
export type { AppliedState, DraftApi, DraftAxis, PendingCount, QueryDraft } from './features/deferred-apply'
export type { ConfirmationOptions, DeletingConfig, DeletingContext } from './features/deleting'
export { EditingMode } from './features/editing'
export type { EditingConfig, EditingSaveContext, EditingState } from './features/editing'
// Sourced from the feature modules (not `./types`) so their
// `declare module '@tanstack/table-core'` augmentations (state.infinite /
// setInfiniteStatus, state.loading) survive into the bundled `.d.ts`.
export type { InfiniteState } from './features/infinite'
export type { LoadingState } from './features/loading'

// Validation API
export { ValidationError, isValidationError, zodResolver } from './features/validation'

export type {
	CommitStatus,
	FieldState,
	ValidateConfig,
	ValidateContext,
	ValidateOn,
	ValidationErrors,
	ValidationProblems,
	ValidationResult,
} from './features/validation'

export { ExpandingMode } from './types'
export type {
	ColumnResizeDirection,
	ColumnResizeMode,
	DataTable,
	ExpandingConfig,
	FilteringConfig,
	GlobalFilterFn,
	GlobalFilteringConfig,
	InitialTableState,
	LoadMoreDirection,
	MultiSortConfig,
	MultiSortEvent,
	PaginationConfig,
	ColumnPinningFeatureConfig,
	ColumnVisibilityConfig,
	PaginationTotals,
	PinningConfig,
	RowPinningConfig,
	SelectionConfig,
	ResizingConfig,
	SortingConfig,
	SortingState,
	SortingStateEntry,
	Table,
	TableConfig,
	TableSnapshot,
	RowVirtualOptions,
	VirtualizationConfig,
} from './types'
