// React hook
export { useDataGrid, PAGE_SIZER_KEY } from './use-data-grid'
export type { UseDataGridConfig, PageSizerConfig } from './use-data-grid'

// Factory
export { createDataGrid } from './create-data-grid'

// Compound component
export { DataGrid } from './data-grid/data-grid'
export type { DataGridProps } from './data-grid/data-grid'

// DI context
export {
  GridComponentsProvider,
  defaultComponents,
  useGridComponents,
} from './components-context'

// Cell type registry
export { CellTypesProvider, useCellTypes } from './cell-types-context'
export type {
  CellTypeDefinition,
  CellTypeRegistry,
  CellViewProps,
  CellInputProps,
} from './cell-types-context'

// Utilities
export { getCommonPinStyles } from './utils/pin-styles'

// Types
export type { GridComponents } from './types'
export type {
  ButtonProps,
  CheckboxProps,
  DateFieldProps,
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
  ColumnDef,
  CreatingConfig,
  DataTable,
  DeletingConfig,
  EditingConfig,
  Table,
  TableConfig,
  TableSnapshot,
} from '@ez-kit/data-grid-core'

export { defineColumns, createTable } from '@ez-kit/data-grid-core'
