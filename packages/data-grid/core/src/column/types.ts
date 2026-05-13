/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { BetweenOperatorConfig, ColumnOperatorsConfig, FilterOperatorDef } from '../features/operators'
import type { FieldState, ValidateOn } from '../features/validation'
import type { ColumnDef as TableCoreColumnDef, ColumnMeta as TableCoreColumnMeta, RowData } from '@tanstack/table-core'

/** Comparator signature for custom sort functions. Compatible with TanStack `SortingFn`. */
export type SortingFn = (rowA: unknown, rowB: unknown, columnId: string) => number

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
export type DateCellConfig = {
	/** ISO 8601 date string forwarded to the UI-kit date picker as a hard minimum. */
	minValue?: string
	/** ISO 8601 date string forwarded to the UI-kit date picker as a hard maximum. */
	maxValue?: string
	/** Forwarded to `Intl.DateTimeFormat` by the view renderer. */
	format?: Intl.DateTimeFormatOptions
}

// ── cell definition (discriminated union) ─────────────────────────────────

type SimpleType = Exclude<CellType, 'select' | 'badge' | 'image' | 'link' | 'progress' | 'date'>

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

type DateCellDef<TRow, TValue = unknown> = {
	type: 'date'
	config?: DateCellConfig
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
	| DateCellDef<TRow, TValue>
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
	/**
	 * Custom edit input component for this column.
	 * Receives a {@link FieldState} with `value`, `onChange`, `onBlur`, `error`, `errors`, `isValidating`, `config`.
	 */
	component?: (props: FieldState) => unknown
	/**
	 * Help text rendered under the input in the edit form.
	 * Forwarded to `FieldState.description` so composite cell types can show it
	 * via the kit's `<FieldDescription>` / `<Description>` slot.
	 */
	description?: string
}

export type ColumnCreatingConfig = {
	/**
	 * Custom create input component for this column. Falls back to `editing.component` when omitted.
	 * Receives a {@link FieldState} with the same shape as {@link ColumnEditingConfig.component}.
	 */
	component?: (props: FieldState) => unknown
	/**
	 * Help text rendered under the input in the create form.
	 * Forwarded to `FieldState.description`.
	 */
	description?: string
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

/** Built-in TanStack sort functions. The `string & {}` tail keeps custom registry IDs valid. */
export type BuiltInSortingFn =
	| 'alphanumeric'
	| 'alphanumericCaseSensitive'
	| 'text'
	| 'textCaseSensitive'
	| 'datetime'
	| 'basic'

/**
 * How undefined values are positioned during sort.
 * `false` (default) treats undefined as 0. Numeric variants directly forward to TanStack.
 */
export type ColumnSortUndefined = 'first' | 'last' | -1 | 1 | false

/**
 * Column-level sorting config.
 *
 * @example Disable sorting on a column
 * ```ts
 * { accessorKey: 'avatar', sorting: false }
 * ```
 *
 * @example Custom sort function (built-in name)
 * ```ts
 * { accessorKey: 'createdAt', sorting: { fn: 'datetime' } }
 * ```
 *
 * @example Inverted score column where lower = better
 * ```ts
 * { accessorKey: 'rank', sorting: { invert: true, undefined: 'last' } }
 * ```
 */
export type ColumnSortingConfig = {
	/** First click sorts descending. Overrides table-level `sorting.descFirst`. */
	descFirst?: boolean
	/**
	 * Built-in name, registry id (matches `sorting.fns`), or inline comparator.
	 *
	 * @example Built-in name (TanStack-provided)
	 * ```ts
	 * { accessorKey: 'updatedAt', sorting: { fn: 'datetime' } }
	 * ```
	 *
	 * @example Registry id resolved from `sorting.fns` on the table
	 * ```ts
	 * { accessorKey: 'priority', sorting: { fn: 'priorityRank' } }
	 * ```
	 *
	 * @example Inline comparator
	 * ```ts
	 * { accessorKey: 'tag', sorting: { fn: (a, b, id) => weight[a.getValue(id)] - weight[b.getValue(id)] } }
	 * ```
	 */
	fn?: BuiltInSortingFn | (string & {}) | SortingFn
	/**
	 * Where `undefined` values land. Default: false → treated as 0.
	 *
	 * @example Push missing values to the bottom regardless of direction
	 * ```ts
	 * { accessorKey: 'lastSeen', sorting: { undefined: 'last' } }
	 * ```
	 */
	undefined?: ColumnSortUndefined
	/**
	 * Invert direction (useful for ranking columns where lower = "better").
	 *
	 * @example Lower rank wins, but the header still shows the natural ↑/↓ arrow
	 * ```ts
	 * { accessorKey: 'rank', sorting: { invert: true } }
	 * ```
	 */
	invert?: boolean
	/** Allow this column to participate in multi-sort. Default: true (when multi enabled). */
	multi?: boolean
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
	/**
	 * Column-level sorting config.
	 * - `false` — disable sorting for this column
	 * - {@link ColumnSortingConfig} — fine-grained control (descFirst, fn, undefined, invert, multi)
	 */
	sorting?: false | ColumnSortingConfig

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
	/**
	 * Whether this column participates in table-level global search.
	 * - `false` — column is excluded from global search results
	 * - omitted / `true` — column participates (default)
	 *
	 * Independent from {@link ColumnDef.filtering}: a column can have its own
	 * filter popover disabled but still be searchable via global filter, or
	 * vice versa.
	 */
	globalFilter?: boolean
	/** Column-level editing config. Set to false to disable. */
	editing?: false | ColumnEditingConfig
	/** Column-level creating config. Set to false to disable. */
	creating?: false | ColumnCreatingConfig

	/**
	 * Override the global `creating.validateOn` / `editing.validateOn` for this column.
	 * Useful for per-field UX (e.g. email validates onBlur, password onChange for live strength meter).
	 */
	validateOn?: ValidateOn
	/**
	 * Override the global `creating.validateDebounceMs` / `editing.validateDebounceMs` for this column.
	 * Applies only when the resolved `validateOn` is `'change'`.
	 */
	validateDebounceMs?: number

	// Pass-through TanStack options
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
		/** Per-column override for the global creating/editing `validateOn`. */
		validateOn?: ValidateOn
		/** Per-column override for the global creating/editing `validateDebounceMs`. */
		validateDebounceMs?: number
	}
}
