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
export { createColumnHelper } from './column/create-column-helper'
// The one place the "a column's `creating` falls back to its `editing`" rule is written, so the
// headless feature and the React form layer cannot drift on it.
export { ColumnFormMode, resolveColumnFormConfig } from './column/resolve-form-config'
export type { ResolvedColumnFormConfig } from './column/resolve-form-config'
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
	ColumnCellMeta,
	ColumnFilteringMeta,
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
	// The **input** renderer slot — `filtering.component`, `editing.component`,
	// `creating.component`. Exported for the same reason as `ColumnRenderer` beside it, and
	// with more need: its props are compared bivariantly so an author can annotate the
	// `cell.config` the component reads, and that subtlety is exactly what someone factoring
	// a shared filter input out into its own binding has to be able to name.
	ColumnInputRenderer,
	ExoticComponentLike,
	DateCellConfig,
	ImageCellConfig,
	LinkCellConfig,
	InputComponentProps,
	ProgressCellConfig,
	SelectCellConfig,
	SelectItem,
	SortingFn,
	SystemColumnDef,
} from './column/types'

export type { TableState } from '@tanstack/table-core'

export type {
	BetweenOperatorConfig,
	BetweenValue,
	ColumnOperatorsConfig,
	DateRangePreset,
	FilterOperatorDef,
	FilterOperatorId,
	FilterItem,
	OperatorRegistry,
	StructuredFilterValue,
} from './features/operators'
// Every built-in operator list, so extending one reads as extending it —
// `items: [...SELECT_BADGE_OPERATORS, myOperator]`. `SELECT_BADGE_OPERATORS` and
// `EMPTY_OPERATORS` were the two that were not exported, which left the select / badge
// default set nameable only as `DEFAULT_OPERATORS_BY_TYPE.select` — an index signature, so
// `FilterOperatorDef[] | undefined`.
export {
	BOOLEAN_OPERATORS,
	BetweenInputType,
	BetweenInputVariant,
	DATE_OPERATORS,
	DATE_RANGE_PRESETS,
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	EMPTY_OPERATORS,
	FilterOperator,
	IN_OPERATORS,
	NUMBER_OPERATORS,
	SELECT_BADGE_OPERATORS,
	TEXT_OPERATORS,
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
	ValidationIssue,
	ValidationSchema,
	ValidationErrors,
	ValidationProblems,
	ValidationResult,
} from './features/validation'

export {
	BuiltInGlobalFilterFn,
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
	GlobalFilterFnId,
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
