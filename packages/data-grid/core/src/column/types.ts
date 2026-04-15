import type { ColumnDef as TanStackColumnDef } from '@tanstack/table-core'

export type { TanStackColumnDef }

/** Built-in cell types. The `string & {}` tail allows custom type strings while preserving autocomplete. */
export type CellType = 'text' | 'number' | 'date' | 'boolean' | (string & {})

export interface CellViewCtx<TRow, TValue> {
  row: TRow
  value: TValue
  rowIndex: number
}

/** Props passed to column-level input components (filtering, editing, creating). */
export interface InputComponentProps {
  value: unknown
  onChange: (value: unknown) => void
}

export interface CellDef<TRow, TValue = unknown> {
  type?: CellType
  /** Custom view-mode renderer for this cell. */
  component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

export interface ColumnFilteringConfig {
  /** Custom filter input component for this column. */
  component?: (props: InputComponentProps) => unknown
}

export interface ColumnEditingConfig {
  /** Custom edit input component for this column. */
  component?: (props: InputComponentProps) => unknown
}

export interface ColumnCreatingConfig {
  /** Custom create input component for this column. Falls back to `editing.component` when omitted. */
  component?: (props: InputComponentProps) => unknown
}

/**
 * User-facing column definition for @ez-kit/data-grid.
 * Converted to TanStack ColumnDef via mapColumns().
 */
export interface ColumnDef<TRow extends object> {
  id?: string
  accessorKey?: keyof TRow & string
  accessorFn?: (row: TRow, index: number) => unknown
  header?: string
  footer?: string
  columns?: ColumnDef<TRow>[]

  /** Pin column to left or right edge (sticky). */
  pin?: 'left' | 'right'
  /** Set to false to disable sorting for this column. */
  sorting?: false

  /** Cell display and input configuration. */
  cell?: CellDef<TRow>

  /** Column-level filtering config. Set to false to disable. */
  filtering?: false | ColumnFilteringConfig
  /** Column-level editing config. Set to false to disable. */
  editing?: false | ColumnEditingConfig
  /** Column-level creating config. Set to false to disable. */
  creating?: false | ColumnCreatingConfig

  // Pass-through TanStack options
  enableSorting?: boolean
  enableColumnFilter?: boolean
  enableGlobalFilter?: boolean
  enableHiding?: boolean
  enableResizing?: boolean
  size?: number
  minSize?: number
  maxSize?: number
}

/** Augment TanStack's ColumnMeta with our custom fields. */
declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    pin?: 'left' | 'right'
    cellType?: CellType
    /** Resolved view renderer from `cell.component`. */
    cellView?: (ctx: CellViewCtx<unknown, unknown>) => unknown
    filtering?: false | ColumnFilteringConfig
    editing?: false | ColumnEditingConfig
    creating?: false | ColumnCreatingConfig
    isSystemColumn?: boolean
    systemColumnType?: 'selection' | 'expand' | 'actions' | 'row_pin'
  }
}
