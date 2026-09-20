// Core factory
export { createTable } from './create-table'

/**
 * The other half of the hybrid packaging (design D3): `createTable` builds a table for the vanilla
 * path, and `createTableOptions` resolves a {@link TableConfig} into the v9 options that describe
 * it **without constructing anything** — so a framework adapter can hand those options to its own
 * constructor. `useDataGrid` passing them to `useTable` is the consumer this exists for, and the
 * reason a React table is not built by calling `createTable` from inside a hook.
 *
 * It returns `{ options, deferred, grid, bindStateHandlers }`. `options` goes to the constructor;
 * `grid` is the non-TanStack bag the caller assigns to `table.grid`; `bindStateHandlers(table)`
 * yields the `on<Slice>Change` handlers, which cannot be part of `options` because each writes
 * through the table's own atoms and the table does not exist while its options are being built.
 *
 * Kept internal by Task 1 "until PR 1 adds the public export when the React package starts using
 * it", and then exported by no task — it fell between that task and the one that closed PR 1, and
 * PR 2 cannot start without it.
 */
export { createTableOptions } from './create-table/create-table-options'

/**
 * `GridOptions` is exported because {@link DataTable.grid} is already typed with it, so it is
 * **reachable but was not nameable**: a consumer could write `const g = table.grid` and get the
 * type, and could not write the annotation for it. That is true of any consumer, not only of the
 * React package, which is why this does not wait on PR 2 establishing a need.
 *
 * `StateHandlerTable` is the structural table `bindStateHandlers`' handlers are bound to; it is
 * named here for the same reason — it sits in that function's public signature.
 */
export type { GridOptions, StateHandlerTable } from './create-table/create-table-options'

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
export type { FormColumnMeta, ResolvedColumnFormConfig } from './column/resolve-form-config'
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

// Every user-facing string, and the English dictionary that is their default
export { defaultMessages, resolveMessages } from './messages'
export type {
	CountContext,
	DraftSummaryContext,
	FilterPlaceholderContext,
	GridMessages,
	PartialGridMessages,
} from './messages'

// System column IDs
export { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

// One custom action entry — contributed per row (`rowActions.actions`) or for the whole
// selection (`selection.bar.actions`), and rendered by the kit either way.
export type { ActionItem, ActionItemDef, ActionItemSlot } from './action-item'

// Row actions (edit / delete / row-pin menu share the `__actions__` column)
// `ACTION_BUTTON_SIZE` / `getActionsCellWidth` are the cell's own geometry, exported because
// the grid stops auto-sizing the column once an author promotes entries to inline buttons —
// they are how that author writes `rowActions.column.width` in the kit's own units.
export { ACTION_BUTTON_SIZE, getActionsCellWidth, RowActionsPlacement } from './features/row-actions'
export type { RowActionItem, RowActionsConfig, RowActionsContext } from './features/row-actions'

// Types
export type {
	BadgeCellConfig,
	BadgeItem,
	BaseCellTypes,
	BooleanCellConfig,
	CellDef,
	CellTypeContractOf,
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

// The registered feature set's type, which every public type here is generic over. The feature
// *values* are deliberately not re-exported from this entry — they live on
// `@ez-kit/data-grid-core/features`, which is what keeps a feature out of a bundle that never
// registers it.
export type { TableFeatures, TableState } from '@tanstack/table-core'

export type {
	BetweenOperatorConfig,
	BetweenValue,
	ColumnOperatorsConfig,
	DatePreset,
	DateRangePreset,
	FilterOperatorDef,
	FilterOperatorId,
	FilterItem,
	DateValuePreset,
	OperatorRegistry,
	StructuredFilterValue,
	TableOperatorsConfig,
} from './features/operators'
// Every built-in operator list, so extending one reads as extending it —
// `items: [...SELECT_BADGE_OPERATORS, myOperator]`. `SELECT_BADGE_OPERATORS` and
// `EMPTY_OPERATORS` were the two that were not exported, which left the select / badge
// default set nameable only as `DEFAULT_OPERATORS_BY_TYPE.select` — an index signature, so
// `FilterOperatorDef[] | undefined`.
export {
	BOOLEAN_OPERATORS,
	BetweenInputType,
	DATE_OPERATORS,
	DATE_VALUE_PRESETS,
	DATE_RANGE_PRESETS,
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	EMPTY_OPERATORS,
	FilterOperator,
	IN_OPERATORS,
	isDateRangePreset,
	// The two label overlays: the operator lists are settled in core, their wording comes from
	// the grid's dictionary, and the React layer applies these where the controls are rendered.
	localizeDatePresets,
	localizeOperators,
	NUMBER_OPERATORS,
	SELECT_BADGE_OPERATORS,
	TEXT_OPERATORS,
} from './features/operators'

// Reordering: the pure helpers the UI drives it with, per axis. In core, not the React layer,
// because the rules they encode (same pin band, same parent, locked columns) are the feature's
// semantics, not its chrome. `applyRowOrder` is here for the same reason an adapter needs it:
// rendering an uncontrolled row order means reordering `data`, and the rule for a row the order
// does not name belongs to the feature.
export {
	applyRowMove,
	applyRowOrder,
	canMoveColumn,
	canMoveRow,
	ColumnMoveDirection,
	ColumnMoveScope,
	moveColumn,
	moveRow,
	RowMoveDirection,
} from './features/ordering'
export type { RowMove, RowOrderState } from './features/ordering'

export { CreatingMode } from './features/creating'
export type {
	CreateDefaultValueContext,
	CreateDefaultValuesContext,
	CreatingApi,
	CreatingConfig,
	CreatingSaveContext,
	CreatingState,
} from './features/creating'
/**
 * `createAppliedEmitter` is exported for the same reason `createTableOptions` is: the React
 * adapter constructs its table through `useTable`, so everything `createTable` does *after*
 * `constructTable` has to be redone in the hook — and two of those jobs, minting the draft atoms
 * and projecting `config.onStateChange` through the applied snapshot, are these two functions.
 * Without the second one the hook would either re-implement the projection (a second answer to
 * "what is the consumer allowed to see") or drop deferral from `onStateChange` in React only.
 */
export { createAppliedEmitter, createDraftAtoms, DraftAxis } from './features/deferred-apply'
export type {
	AppliedState,
	DraftApi,
	DraftAtoms,
	DraftConfig,
	PendingCount,
	QueryDraft,
} from './features/deferred-apply'
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
// Sourced from the feature modules (not `./types`) so each state type is re-exported from the
// module that declares the slice it names. The declaration merging those modules perform is
// per-feature — `Plugins`, `TableState_FeatureMap`, `TableState_All` — and reaches a consumer
// through `@ez-kit/data-grid-core/features`, which is where the features themselves are exported.
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
	OrderingConfig,
	PaginationConfig,
	ColumnOrderingConfig,
	RowOrderingConfig,
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
