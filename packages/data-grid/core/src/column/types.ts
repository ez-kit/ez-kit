/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { CreateDefaultValueContext } from '../features/creating'
import type {
	BetweenOperatorConfig,
	ColumnOperatorsConfig,
	FilterOperatorDef,
	MultiSelectOption,
} from '../features/operators'
import type { FieldState, ValidateOn } from '../features/validation'
import type {
	ColumnDef as TableCoreColumnDef,
	ColumnMeta as TableCoreColumnMeta,
	HeaderContext,
	RowData,
} from '@tanstack/table-core'

/** Comparator signature for custom sort functions. Compatible with TanStack `SortingFn`. */
export type SortingFn = (rowA: unknown, rowB: unknown, columnId: string) => number

export type TanStackColumnDef<TRow extends RowData, TValue = unknown> = TableCoreColumnDef<TRow, TValue> & {
	accessorKey?: string
	columns?: TanStackColumnDef<TRow, unknown>[]
	meta?: TableCoreColumnMeta<TRow, TValue>
}

/**
 * The cell types this package implements. A closed union — the escape hatch for
 * project-specific types is {@link CellType}'s tail, not this.
 */
export type BuiltInCellType =
	| 'text'
	| 'number'
	| 'date'
	| 'boolean'
	| 'select'
	| 'badge'
	| 'image'
	| 'link'
	| 'progress'

/**
 * A cell type as it may appear on a column or in `ColumnMeta`. The `string & {}` tail keeps
 * a project-registered custom type assignable while preserving autocomplete for the built-ins.
 *
 * Deliberately **not** what `ColumnDef['cell'].type` accepts: there the type is checked against
 * the kit's actual registry via `CellDef`'s `TCustom` parameter, so a typo is a compile error.
 */
export type CellType = BuiltInCellType | (string & {})

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

/**
 * Built-in types that need no `config` block. Derived from {@link BuiltInCellType}, **not** from
 * {@link CellType}: the latter's `string & {}` tail would make this arm swallow every string, so
 * `cell: { type: 'raiting' }` typechecked no matter what the kit registered — which silently
 * defeated `CellDef`'s whole `TCustom` parameter.
 */
type SimpleType = Exclude<BuiltInCellType, 'select' | 'badge' | 'image' | 'link' | 'progress' | 'date'>

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
	/**
	 * Explicit option list for multi-value (`in` / `notIn`) filters. Wins over both
	 * `cell.config.items` (for `select` / `badge` cell types) and faceted values.
	 */
	options?: MultiSelectOption[]
	/**
	 * Per-column override for faceted unique values / counts. When `true`, this
	 * column reads `column.getFacetedUniqueValues()` regardless of the table-level
	 * `filtering.faceted` flag. When `false`, this column never uses faceted data
	 * even if the table-level flag is on.
	 */
	faceted?: boolean
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

export type ColumnCreatingConfig<TRow = unknown, TValue = unknown> = {
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
	/**
	 * Value this column's field is seeded with when the create form opens.
	 *
	 * Resolved on **every** `creating.start()`, not once at table construction — hence
	 * `defaultValue` and not `initialValue` (unlike {@link ColumnPinningDef.initialPin} /
	 * {@link ColumnVisibilityDef.initialHidden}, which seed `initialState` a single time).
	 * The function form therefore sees the table as it is at the moment the form opens.
	 *
	 * Must be **synchronous**: an async default would open the form empty and then make the
	 * field jump once the promise settled. Load async seeds before calling `start()` and pass
	 * them through the table-level `creating.defaultValues` instead.
	 *
	 * A column that omits `defaultValue` contributes **no key** to `state.creating.values` —
	 * not a key holding `undefined`.
	 *
	 * The function form is detected with `typeof === 'function'`. A value that is itself a
	 * function can therefore not be passed directly; wrap it (`defaultValue: () => myFn`).
	 */
	defaultValue?: TValue | ((ctx: CreateDefaultValueContext<TRow>) => TValue)
}

export type ColumnPinningDef = {
	/** Static pin — always pinned, no pin section in column menu. */
	pin?: 'left' | 'right'
	/** Seeds `initialState.columnPinning` — starts pinned, user can change via column menu. */
	initialPin?: 'left' | 'right'
}

export type ColumnVisibilityDef = {
	/** Seeds `initialState.columnVisibility` — starts hidden, user can toggle it on. */
	initialHidden?: boolean
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
	/**
	 * Column header. A plain string, or a render function for anything richer — an icon
	 * beside the label, a tooltip, a badge.
	 *
	 * The return type is `unknown` because core is framework-agnostic: it never calls this,
	 * it hands it to the adapter, which renders it (React: any `ReactNode`).
	 *
	 * @example
	 * ```tsx
	 * { accessorKey: 'total', header: () => <span>Total <InfoIcon /></span> }
	 * ```
	 */
	header?: string | ((ctx: HeaderContext<TRow, unknown>) => unknown)
	/**
	 * Column footer, same shape as {@link ColumnDef.header}.
	 *
	 * Reaches TanStack (`table.getFooterGroups()`) but is **not** auto-rendered — the built-in
	 * `<DataGrid.Table />` layout has no footer row. Read it yourself when composing a custom
	 * body with `<DataGrid.Table>{…}</DataGrid.Table>`.
	 */
	footer?: string | ((ctx: HeaderContext<TRow, unknown>) => unknown)
	columns?: ColumnDef<TRow, TCustomCellTypes>[]

	/**
	 * Column pinning configuration.
	 * - `false` — pinning disabled, no pin section in column menu
	 * - `{ pin: 'left' }` — always pinned left (static), no menu section
	 * - `{ initialPin: 'left' }` — starts pinned left, user can change via menu
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
	 * - `false` — hiding disabled for this column: it is always visible and gets no Hide
	 *   option in the column menu
	 * - `{ initialHidden: true }` — starts hidden, user can toggle it on
	 *
	 * `false` reads the same as every other per-column switch (`sorting: false`,
	 * `filtering: false`, `editing: false`, `resizing: false`): it turns the feature off
	 * for this column. Note that the *table*-level `columnVisibility` flag is the opposite
	 * polarity by nature — it turns hiding on for the grid as a whole.
	 */
	visibility?: false | ColumnVisibilityDef

	/** Column-level filtering config. Set to false to disable. */
	filtering?: false | ColumnFilteringConfig
	/**
	 * Whether this column participates in table-level global search.
	 * - `false` — column is excluded from global search results
	 * - omitted — column participates (default)
	 *
	 * Named for the table option it switches off ({@link TableConfig.globalFiltering}), the
	 * way every other per-column switch is. Independent from {@link ColumnDef.filtering}: a
	 * column can have its own filter popover disabled but still be searchable via global
	 * search, or vice versa.
	 */
	globalFiltering?: false
	/** Column-level editing config. Set to false to disable. */
	editing?: false | ColumnEditingConfig
	/** Column-level creating config. Set to false to disable. */
	creating?: false | ColumnCreatingConfig<TRow>

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

	/**
	 * Column-level resizing. `false` pins the column's width — the resize handle is not
	 * rendered and `column.getCanResize()` returns false.
	 *
	 * The alias for TanStack's `enableResizing`, matching the `sorting` / `filtering` /
	 * `visibility` shape. There is deliberately no raw `enable*` pass-through on a column:
	 * two spellings of one switch is how they drift.
	 */
	resizing?: false

	/**
	 * Class applied to this column's header cell (`<th>`).
	 *
	 * Deliberately three names rather than one `className`: a single field would have to mean
	 * "header and cells alike", and that is almost never what a column wants — right-alignment
	 * belongs to both, a value-driven highlight only to the cells.
	 */
	headerClassName?: string
	/**
	 * Class applied to this column's body cells (`<td>`).
	 *
	 * The function form runs per cell, so it can key off the value or the row — the common
	 * "colour this cell by its status" case, which previously had no route that did not involve
	 * rebuilding the whole body. Return `undefined` to add nothing.
	 *
	 * @example
	 * ```ts
	 * { accessorKey: 'balance', cellClassName: ({ value }) => (Number(value) < 0 ? 'text-red-600' : undefined) }
	 * ```
	 */
	cellClassName?: string | ((ctx: CellViewCtx<TRow, unknown>) => string | undefined)
	/** Class applied to this column's footer cell. Only rendered inside `<DataGrid.Footer />`. */
	footerClassName?: string

	// Pass-through TanStack options
	size?: number
	minSize?: number
	maxSize?: number
}

/** Augment TanStack's ColumnMeta with our custom fields. */
declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ColumnMeta<TData, TValue> {
		columnPinning?: false | ColumnPinningDef
		cellType?: CellType
		config?: Record<string, unknown>
		/** Class for this column's header cell, from `column.headerClassName`. */
		headerClassName?: string
		/** Class (or per-cell resolver) for this column's body cells, from `column.cellClassName`. */
		cellClassName?: string | ((ctx: CellViewCtx<unknown, unknown>) => string | undefined)
		/** Class for this column's footer cell, from `column.footerClassName`. */
		footerClassName?: string
		/** Resolved view renderer from `cell.component`. */
		cellView?: (ctx: CellViewCtx<unknown, unknown>) => unknown
		filtering?: false | ColumnFilteringConfig
		editing?: false | ColumnEditingConfig
		creating?: false | ColumnCreatingConfig<TData, TValue>
		visibility?: false | ColumnVisibilityDef
		isSystemColumn?: boolean
		systemColumnType?: 'selection' | 'expand' | 'actions'
		/** Pre-resolved operator list for this column (set when filtering.operators is configured). */
		resolvedOperators?: FilterOperatorDef[]
		/** Between operator UI config passed from filtering.operators.betweenOperator. */
		betweenOperatorConfig?: BetweenOperatorConfig
		/** Default operator ID for this column (derived from config or cell type default). */
		defaultOperatorId?: string
		/** Explicit multi-select option list from `column.filtering.options`. */
		filteringOptions?: MultiSelectOption[]
		/**
		 * Effective faceted flag for this column. Set to true when the resolved config
		 * (table-level `filtering.faceted` or column-level `filtering.faceted`) opts in.
		 */
		facetedEnabled?: boolean
		/** Per-column override for the global creating/editing `validateOn`. */
		validateOn?: ValidateOn
		/** Per-column override for the global creating/editing `validateDebounceMs`. */
		validateDebounceMs?: number
	}
}
