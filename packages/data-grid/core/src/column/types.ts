/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { BetweenOperatorConfig, ColumnOperatorsConfig, FilterOperatorDef } from '../features/operators'
import type { ColumnDef as TableCoreColumnDef, ColumnMeta as TableCoreColumnMeta, RowData } from '@tanstack/table-core'

export type TanStackColumnDef<TRow extends RowData, TValue = unknown> = TableCoreColumnDef<TRow, TValue> & {
	accessorKey?: string
	columns?: TanStackColumnDef<TRow, unknown>[]
	meta?: TableCoreColumnMeta<TRow, TValue>
}

/** Built-in cell types. The `string & {}` tail allows custom type strings while preserving autocomplete. */
export type CellType =
	| 'text'
	| 'number'
	| 'date'
	| 'boolean'
	| 'select'
	| 'badge'
	| 'image'
	| 'link'
	| 'progress'
	| (string & {})

export type CellViewCtx<TRow, TValue> = {
	row: TRow
	value: TValue
	rowIndex: number
}

/** Props passed to column-level input components (filtering, editing, creating). */
export type InputComponentProps = {
	value: unknown
	onChange: (value: unknown) => void
}

// ── cell config types ─────────────────────────────────────────────────────

export type SelectItem = {
	value: string
	label: string
}
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
export type BadgeItem = {
	value: string
	label: string
	variant?: BadgeVariant
}

export type SelectCellConfig = {
	items: SelectItem[]
}
export type BadgeCellConfig = {
	items: BadgeItem[]
}
export type ImageCellConfig = {
	alt?: string
	width?: number
	height?: number
}
export type ProgressCellConfig = {
	max?: number
}

// ── cell definition (discriminated union) ─────────────────────────────────

type SimpleType = Exclude<CellType, 'select' | 'badge' | 'image' | 'link' | 'progress'>

type BasicCellDef<TRow, TValue = unknown> = {
	type?: SimpleType
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

type SelectCellDef<TRow, TValue = unknown> = {
	type: 'select'
	config: SelectCellConfig
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

type BadgeCellDef<TRow, TValue = unknown> = {
	type: 'badge'
	config: BadgeCellConfig
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

type ImageCellDef<TRow, TValue = unknown> = {
	type: 'image'
	config?: ImageCellConfig
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

type LinkCellDef<TRow, TValue = unknown> = {
	type: 'link'
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

type ProgressCellDef<TRow, TValue = unknown> = {
	type: 'progress'
	config?: ProgressCellConfig
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

type CustomCellDef<TRow, TValue, TCustom extends string> = {
	type: TCustom
	config?: Record<string, unknown>
	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
}

export type CellDef<TRow extends object, TValue = unknown, TCustom extends string = never> =
	| BasicCellDef<TRow, TValue>
	| SelectCellDef<TRow, TValue>
	| BadgeCellDef<TRow, TValue>
	| ImageCellDef<TRow, TValue>
	| LinkCellDef<TRow, TValue>
	| ProgressCellDef<TRow, TValue>
	| ([TCustom] extends [never] ? never : CustomCellDef<TRow, TValue, TCustom>)

export type ColumnFilteringConfig = {
	/** Custom filter input component for this column. */
	component?: (props: InputComponentProps) => unknown
	/** Operator configuration. `true` = default operators for the column's cell type. */
	operators?: boolean | ColumnOperatorsConfig
	/** Override the default selected operator for this column. */
	defaultOperator?: string
}

export type ColumnEditingConfig = {
	/** Custom edit input component for this column. */
	component?: (props: InputComponentProps) => unknown
}

export type ColumnCreatingConfig = {
	/** Custom create input component for this column. Falls back to `editing.component` when omitted. */
	component?: (props: InputComponentProps) => unknown
}

export type ColumnPinningDef = {
	/** Static pin — always pinned, no pin section in column menu. */
	pin?: 'left' | 'right'
	/** Dynamic default pin — starts pinned, user can change via column menu. */
	defaultPin?: 'left' | 'right'
}

export type ColumnVisibilityDef = {
	/** Column starts hidden but can be toggled by the user. */
	defaultHidden?: boolean
}

/**
 * User-facing column definition for @ez-kit/data-grid.
 * Converted to TanStack ColumnDef via mapColumns().
 */
export type ColumnDef<TRow extends object, TCustomCellTypes extends string = never> = {
	id?: string
	accessorKey?: keyof TRow & string
	accessorFn?: (row: TRow, index: number) => unknown
	header?: string
	footer?: string
	columns?: ColumnDef<TRow, TCustomCellTypes>[]

	/**
	 * Column pinning configuration.
	 * - `false` — pinning disabled, no pin section in column menu
	 * - `{ pin: 'left' }` — always pinned left (static), no menu section
	 * - `{ defaultPin: 'left' }` — starts pinned left, user can change via menu
	 */
	pinning?: false | ColumnPinningDef
	/** Set to false to disable sorting for this column. */
	sorting?: false

	/** Cell display and input configuration. */
	cell?: CellDef<TRow, unknown, TCustomCellTypes>

	/**
	 * Column visibility configuration.
	 * - `false` — column cannot be hidden (always visible, no Hide option in menu)
	 * - `{ defaultHidden: true }` — starts hidden, user can toggle it on
	 */
	visibility?: false | ColumnVisibilityDef

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
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface ColumnMeta<TData, TValue> {
		columnPinning?: false | ColumnPinningDef
		cellType?: CellType
		config?: Record<string, unknown>
		/** Resolved view renderer from `cell.component`. */
		cellView?: (ctx: CellViewCtx<unknown, unknown>) => unknown
		filtering?: false | ColumnFilteringConfig
		editing?: false | ColumnEditingConfig
		creating?: false | ColumnCreatingConfig
		visibility?: false | ColumnVisibilityDef
		isSystemColumn?: boolean
		systemColumnType?: 'selection' | 'expand' | 'actions' | 'row_pin'
		/** Pre-resolved operator list for this column (set when filtering.operators is configured). */
		resolvedOperators?: FilterOperatorDef[]
		/** Between operator UI config passed from filtering.operators.betweenOperator. */
		betweenOperatorConfig?: BetweenOperatorConfig
		/** Default operator ID for this column (derived from config or cell type default). */
		defaultOperatorId?: string
	}
}
