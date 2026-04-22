// Core factory
export { createTable } from './create-table'

// Column helpers
export { defineColumns } from './column/define-columns'
export { mapColumns } from './column/map-columns'

// System column IDs
export {
  ACTIONS_COLUMN_ID,
  EXPAND_COLUMN_ID,
  ROW_PIN_COLUMN_ID,
  SELECTION_COLUMN_ID,
} from './system-columns'

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

export type {
  ColumnResizeDirection,
  ColumnResizeMode,
  DataTable,
  ExpandingConfig,
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
