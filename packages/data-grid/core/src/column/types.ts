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

/**
 * The shape `React.memo(...)` / `React.forwardRef(...)` produce: an object tagged with a
 * `$$typeof` symbol rather than a callable. Named structurally so core stays framework-agnostic
 * while still accepting them — `flexRender` recognises exactly this tag at runtime.
 */
export type ExoticComponentLike = { $$typeof: symbol }

/**
 * A renderer slot on a column: a component taking `TProps` and returning the adapter's node
 * type, or one of the exotic wrappers.
 *
 * `TNode` is what the adapter renders — `unknown` in core, which never calls these and only
 * carries them through. The React adapter re-exports {@link ColumnDef} with `TNode` bound to
 * `ReactNode`, so a column written against the adapter gets its JSX return type-checked. It is a
 * type parameter rather than a hand-written React twin for the same reason `ExpandingConfig`
 * takes `TRenderExpanded`: a copy can only drift.
 */
export type ColumnRenderer<TProps, TNode> = ((props: TProps) => TNode) | ExoticComponentLike

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
export type TextCellConfig = {
	/** Maximum character count for the rendered view. Longer values are truncated. */
	maxLength?: number
	/**
	 * Suffix appended when truncated.
	 * - `true` (default when `maxLength` set) → `'…'`
	 * - `false` → no marker
	 * - `string` → custom marker (e.g. `'...'`, `' ›'`)
	 */
	ellipsis?: boolean | string
}
export type NumberCellConfig = {
	/** Fixed number of fraction digits (both min and max). */
	decimals?: number
	/** Override the locale's thousands separator (e.g. `' '`, `','`). */
	thousandsSeparator?: string
	/** Override the locale's decimal separator (e.g. `'.'`, `','`). */
	decimalSeparator?: string
	/** String prepended to the formatted value (e.g. `'$'`). */
	prefix?: string
	/** String appended to the formatted value (e.g. `' kg'`). */
	suffix?: string
	/** BCP 47 locale tag. Default: runtime/system locale. */
	locale?: string | string[]
}
export type BooleanCellConfig = {
	/** Label rendered (by the kit's view component) for `true`. */
	trueLabel?: string
	/** Label rendered (by the kit's view component) for `false`. */
	falseLabel?: string
}
export type DateCellConfig = {
	/** ISO 8601 date string forwarded to the UI-kit date picker as a hard minimum. */
	minValue?: string
	/** ISO 8601 date string forwarded to the UI-kit date picker as a hard maximum. */
	maxValue?: string
	/** Forwarded to `Intl.DateTimeFormat` by the view renderer. */
	format?: Intl.DateTimeFormatOptions
}

/**
 * The cell types this package ships a contract for: their ids and the config each accepts.
 *
 * Only the **contract** — core is framework-agnostic and renders nothing. The React layer's
 * `baseCellTypes` attaches renderers to these same ids, and a UI kit extends that. Declaring
 * it here is what keeps the unbound `createColumns` / `createColumnHelper` usable without a
 * kit, which is the documented standalone behaviour.
 *
 * A grid built through `createDataGrid` is typed against **its kit's** registry instead, so a
 * kit that drops a type or adds one is reflected in what its columns accept.
 */
export type BaseCellTypes = {
	text: { __config?: TextCellConfig }
	number: { __config?: NumberCellConfig }
	boolean: { __config?: BooleanCellConfig }
	date: { __config?: DateCellConfig }
	select: { __config?: SelectCellConfig }
	badge: { __config?: BadgeCellConfig }
	image: { __config?: ImageCellConfig }
	link: Record<never, never>
	progress: { __config?: ProgressCellConfig }
}

/** {@link BaseCellTypes}' ids at runtime — what the unbound column helper builds methods from. */
export const BASE_CELL_TYPE_IDS = [
	'text',
	'number',
	'boolean',
	'date',
	'select',
	'badge',
	'image',
	'link',
	'progress',
] as const satisfies readonly (keyof BaseCellTypes)[]

// ── cell definition (registry-driven) ─────────────────────────────────────

/**
 * The framework-neutral shape a cell-type registry must have for a column to be typed against
 * it: a map of type id to something carrying a phantom `__config`.
 *
 * Deliberately loose, and deliberately here rather than in the React adapter. The real registry
 * (`CellTypeRegistry`) holds `ComponentType` slots, which core must never name; and any tighter
 * bound rejects perfectly good registries, because `ComponentType`'s class branch makes its
 * props invariant. Each entry is already validated against `CellTypeDefinition<TConfig>` where
 * it is declared — by `defineCellType` — so nothing is lost by not re-checking it here.
 */
export type CellTypeRegistryShape = Record<string, { __config?: unknown }>

/**
 * The config type a registry entry declares, or `never` when it declares none.
 *
 * Reads the phantom `__config` that `defineCellType` attaches. Inferring from the renderer
 * slots instead is not an option: `view`, `edit`, `creating` and `filter` are four independent
 * inference sites for one type parameter, and they drift.
 */
export type ConfigOf<TDefinition> = TDefinition extends { __config?: infer TConfig } ? TConfig : never

/**
 * One arm of {@link CellDef}: a registered type id, plus the `config` that id declared.
 *
 * `config` is **required** when the declared config has a required field (`select` needs
 * `items`), **optional** when every field is optional (`image`), and **forbidden** when the
 * type declared no config at all. All three are derived from the registry rather than restated
 * per type — which is exactly what the previous hand-written union of seven arms could not do.
 * That union was defeated the moment a kit registered a type whose id matched a built-in: the
 * open `custom` arm swallowed it, so a kit-bound `createColumns` accepted `cell: { type:
 * 'select' }` with no `config`, and `config: { anyTypoAtAll: 1 }` on every type.
 */
type CellArm<TKey extends string, TDefinition, TRow, TValue, TNode> = {
	component?: ColumnRenderer<CellViewCtx<TRow, TValue>, TNode>
} & ([ConfigOf<TDefinition>] extends [never]
	? { type: TKey; config?: undefined }
	: object extends ConfigOf<TDefinition>
		? { type: TKey; config?: ConfigOf<TDefinition> }
		: { type: TKey; config: ConfigOf<TDefinition> })

/**
 * A column's `cell` slot: either no type at all (just a `component`), or one of the types the
 * grid's registry actually holds, carrying that type's own config.
 *
 * `TCellTypes` defaults to the empty registry, so the unbound core `createColumns` accepts no
 * `type` — a cell type with no kit to render it is not a thing that exists.
 */
export type CellDef<
	TRow extends object,
	TValue = unknown,
	TCellTypes extends CellTypeRegistryShape = BaseCellTypes,
	TNode = unknown,
> =
	| {
			type?: undefined
			config?: undefined
			component?: ColumnRenderer<CellViewCtx<TRow, TValue>, TNode>
	  }
	| {
			[TKey in keyof TCellTypes & string]: CellArm<TKey, TCellTypes[TKey], TRow, TValue, TNode>
	  }[keyof TCellTypes & string]

export type ColumnFilteringConfig<TNode = unknown> = {
	/** Custom filter input component for this column. */
	component?: ColumnRenderer<InputComponentProps, TNode>
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

export type ColumnEditingConfig<TNode = unknown> = {
	/**
	 * Custom edit input component for this column.
	 * Receives a {@link FieldState} with `value`, `onChange`, `onBlur`, `error`, `errors`, `isValidating`, `config`.
	 */
	component?: ColumnRenderer<FieldState, TNode>
	/**
	 * Help text rendered under the input in the edit form.
	 * Forwarded to `FieldState.description` so composite cell types can show it
	 * via the kit's `<FieldDescription>` / `<Description>` slot.
	 */
	description?: string
}

export type ColumnCreatingConfig<TRow = unknown, TValue = unknown, TNode = unknown> = {
	/**
	 * Custom create input component for this column. Falls back to `editing.component` when omitted.
	 * Receives a {@link FieldState} with the same shape as {@link ColumnEditingConfig.component}.
	 */
	component?: ColumnRenderer<FieldState, TNode>
	/**
	 * Help text rendered under the input in the create form.
	 * Forwarded to `FieldState.description`.
	 */
	description?: string
	/**
	 * Value this column's field is seeded with when the create form opens.
	 *
	 * Resolved on **every** `creating.start()`, not once at table construction — hence
	 * `defaultValue` and not `initialValue` (unlike {@link ColumnPinningDef.initialSide} /
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

/**
 * Which edge a column is pinned to. Physical, not logical: unlike `align`, a pinned column
 * sticks to a viewport edge, and that edge does not flip with the text direction.
 */
export const ColumnPinSide = {
	Left: 'left',
	Right: 'right',
} as const

export type ColumnPinSide = (typeof ColumnPinSide)[keyof typeof ColumnPinSide]

/**
 * Horizontal alignment of a column's contents. Logical, not physical: `'start'` is the left edge
 * in LTR and the right edge in RTL.
 */
export const ColumnAlign = {
	Start: 'start',
	Center: 'center',
	End: 'end',
} as const

export type ColumnAlign = (typeof ColumnAlign)[keyof typeof ColumnAlign]

/** Per-part alignment override. Any part left out falls back to the grid's default. */
export type ColumnAlignDef = {
	/** Alignment of the header cell (`<th>`). */
	header?: ColumnAlign
	/** Alignment of the body cells (`<td>`). */
	cell?: ColumnAlign
	/** Alignment of the footer cell. */
	footer?: ColumnAlign
}

export type ColumnPinningDef = {
	/** Static pin — always pinned to this side, no pin section in the column menu. */
	side?: ColumnPinSide
	/** Seeds `initialState.columnPinning` — starts pinned, user can change via column menu. */
	initialSide?: ColumnPinSide
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
export type ColumnDef<
	TRow extends object,
	TCellTypes extends CellTypeRegistryShape = BaseCellTypes,
	TNode = unknown,
> = {
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
	header?: string | ColumnRenderer<HeaderContext<TRow, unknown>, TNode>
	/**
	 * Column footer, same shape as {@link ColumnDef.header}.
	 *
	 * Reaches TanStack (`table.getFooterGroups()`) but is **not** auto-rendered — the built-in
	 * `<DataGrid.Table />` layout has no footer row. Read it yourself when composing a custom
	 * body with `<DataGrid.Table>{…}</DataGrid.Table>`.
	 */
	footer?: string | ColumnRenderer<HeaderContext<TRow, unknown>, TNode>
	columns?: ColumnDef<TRow, TCellTypes, TNode>[]

	/**
	 * Column pinning.
	 * - `'left'` / `'right'` — always pinned to that side (static), no menu section
	 * - `false` — pinning disabled, no pin section in column menu
	 * - `{ initialSide: 'left' }` — starts pinned left, user can change via menu
	 * - `{ side: 'left' }` — the long form of the scalar
	 *
	 * The scalar and the object are the same shape `align` and `width` use: the common case is
	 * one word, the object exists for the case the scalar cannot express.
	 */
	pinning?: false | ColumnPinSide | ColumnPinningDef
	/**
	 * Column-level sorting config.
	 * - `false` — disable sorting for this column
	 * - {@link ColumnSortingConfig} — fine-grained control (descFirst, fn, undefined, invert, multi)
	 */
	sorting?: false | ColumnSortingConfig

	/** Cell display and input configuration. */
	cell?: CellDef<TRow, unknown, TCellTypes, TNode>

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
	filtering?: false | ColumnFilteringConfig<TNode>
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
	editing?: false | ColumnEditingConfig<TNode>
	/** Column-level creating config. Set to false to disable. */
	creating?: false | ColumnCreatingConfig<TRow, unknown, TNode>

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
	 * Horizontal alignment of this column's contents.
	 *
	 * The scalar aligns the header, the body cells and the footer alike — the common case, since
	 * a numeric column wants all three at the same edge. The object exists for the exception:
	 *
	 * ```ts
	 * { accessorKey: 'total', align: 'end' }
	 * { accessorKey: 'total', align: { cell: 'end', header: 'start' } }
	 * ```
	 *
	 * `'start'` / `'end'` rather than `'left'` / `'right'`: this axis flips with the text
	 * direction, and the grid already treats RTL as first-class (`sizing.direction`). Column
	 * *pinning* keeps `'left'` / `'right'` — a pinned column sticks to a viewport edge, which
	 * does not flip.
	 *
	 * The React layer emits this as `data-align` on the cell; the shared structural stylesheet
	 * turns it into alignment. A kit needs to do nothing.
	 */
	align?: ColumnAlign | ColumnAlignDef

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

	/**
	 * Column width, in pixels.
	 *
	 * The scalar is the starting width: `width: 200` is the whole story for most columns.
	 * The object adds the bounds a resizable column is dragged between:
	 *
	 * ```ts
	 * { accessorKey: 'name', width: 200 }
	 * { accessorKey: 'name', width: { default: 200, min: 80, max: 400 } }
	 * ```
	 *
	 * Replaces the `size` / `minSize` / `maxSize` pass-throughs: three TanStack names, spelled in
	 * TanStack's vocabulary rather than the grid's, for one property of a column.
	 *
	 * Whether the user may *change* the width is {@link ColumnDef.resizing}, not a field here —
	 * it belongs with `sorting`, `filtering` and `visibility`, where every other per-column
	 * feature switch lives.
	 */
	width?: number | ColumnWidthDef
}

export type ColumnWidthDef = {
	/** Starting width in pixels. TanStack's `size`. */
	default?: number
	/** Lower bound while resizing, in pixels. TanStack's `minSize`. */
	min?: number
	/** Upper bound while resizing, in pixels. TanStack's `maxSize`. */
	max?: number
}

/** Augment TanStack's ColumnMeta with our custom fields. */
declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ColumnMeta<TData, TValue> {
		columnPinning?: false | ColumnPinningDef
		/** Resolved per-part alignment from `column.align`, normalized off the scalar form. */
		columnAlign?: ColumnAlignDef
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
