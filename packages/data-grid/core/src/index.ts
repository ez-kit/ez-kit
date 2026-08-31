// Core factory
export { createTable } from './create-table'

// Default option values (single source; referenced by the React adapter + UI kits)
export {
	DEFAULT_PAGE_SIZE,
	DEFAULT_ROW_ESTIMATE_SIZE,
	DEFAULT_ROW_OVERSCAN,
	DEFAULT_VALIDATE_DEBOUNCE_MS,
	UNKNOWN_PAGE_COUNT,
} from './defaults'

// Feature-toggle contract shared by every feature option
export { featureConfig, isFeatureEnabled } from './utils/feature-flag'
export type { FeatureOption, FeatureToggle } from './utils/feature-flag'

// Column helpers
export { createColumns } from './column/create-columns'
export { mapColumns } from './column/map-columns'
export { createColumnHelper } from './column/create-column-helper'
export {
	BASE_CELL_TYPE_IDS,
	BadgeVariant,
	BuiltInCellType,
	BuiltInSortingFn,
	ColumnAlign,
	ColumnPinSide,
	LinkTarget,
	ColumnSortUndefined,
	LINK_HREF_VALUE_TOKEN,
	SystemColumnType,
} from './column/types'
export type { ColumnHelper } from './column/create-column-helper'

// Menu / row-action icon vocabulary — semantic names each UI kit maps to its own glyphs
export { GridMenuIcon, isGridMenuIcon } from './menu-icon'

// System column IDs
export { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

// Row actions (edit / delete / row-pin menu share the `__actions__` column)
export { RowActionsVariant } from './features/row-actions'
export type { RowActionsConfig, RowActionsContext, RowActionItem } from './features/row-actions'

// Types
export type {
	BadgeCellConfig,
	BadgeItem,
	BaseCellTypes,
	BooleanCellConfig,
	CellDef,
	CellTypeRegistryShape,
	ConfigOf,
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
	ColumnSortingConfig,
	ColumnVisibilityDef,
	// The renderer slot itself. Every user-facing render point on a column (`header`,
	// `footer`, `cell.component`, `filtering.component`, …) is typed with it, so a consumer
	// factoring a shared renderer out into its own binding needs to be able to name it.
	ColumnRenderer,
	ExoticComponentLike,
	DateCellConfig,
	ImageCellConfig,
	LinkCellConfig,
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
	FilterItem,
	OperatorRegistry,
	StructuredFilterValue,
} from './features/operators'
export {
	BetweenInputType,
	BetweenInputVariant,
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
	CreatingApi,
	CreatingConfig,
	CreatingSaveContext,
	CreatingState,
} from './features/creating'
export { DraftAxis } from './features/deferred-apply'
export type { AppliedState, DraftApi, DraftConfig, PendingCount, QueryDraft } from './features/deferred-apply'
export type {
	BulkConfirmationConfig,
	BulkDeletingApi,
	BulkDeletingConfig,
	BulkDeletingContext,
	ConfirmationConfig,
	DeletingApi,
	DeletingConfig,
	DeletingContext,
	DeletingState,
} from './features/deleting'
export { EditingMode } from './features/editing'
export type { EditingApi, EditingConfig, EditingSaveContext, EditingState } from './features/editing'
// Sourced from the feature modules (not `./types`) so their
// `declare module '@tanstack/table-core'` augmentations (state.infinite /
// setInfiniteStatus, state.loading) survive into the bundled `.d.ts`.
export type { InfiniteState } from './features/infinite'
export type { LoadingState } from './features/loading'

// Validation API
export { CommitStatus, ValidateOn, ValidationError, isValidationError, zodResolver } from './features/validation'

export type {
	FieldState,
	ValidateConfig,
	ValidateContext,
	ValidationErrors,
	ValidationProblems,
	ValidationResult,
} from './features/validation'

export {
	GridDirection,
	ColumnResizeMode,
	ExpandingMode,
	LoadMoreDirection,
	MultiSortEvent,
	PaginationMode,
} from './types'
export type {
	DataTable,
	ExpandingConfig,
	FilteringConfig,
	GlobalFilterFn,
	GlobalFilteringConfig,
	InitialTableState,
	MultiSortConfig,
	PaginationConfig,
	ColumnPinningConfig,
	VisibilityConfig,
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
	RowVirtualizationConfig,
	VirtualizationConfig,
} from './types'
