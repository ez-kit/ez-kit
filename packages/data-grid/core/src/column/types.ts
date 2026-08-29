/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { CreateDefaultValueContext } from '../features/creating'
import type { BetweenOperatorConfig, ColumnOperatorsConfig, FilterOperatorDef, FilterItem } from '../features/operators'
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
 * The cell types this package implements. A closed set — the escape hatch for
 * project-specific types is {@link CellType}'s tail, not this.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `cell: { type: 'number' }` is equally valid and needs no import.
 */
export const BuiltInCellType = {
	/** Plain text, optionally truncated — see {@link TextCellConfig}. */
	Text: 'text',
	/** Locale-formatted number — see {@link NumberCellConfig}. */
	Number: 'number',
	/** `Intl.DateTimeFormat`-rendered date — see {@link DateCellConfig}. */
	Date: 'date',
	/** Boolean with per-column labels — see {@link BooleanCellConfig}. */
	Boolean: 'boolean',
	/** Value picked from a fixed list — see {@link SelectCellConfig}. */
	Select: 'select',
	/** Value rendered as a coloured badge — see {@link BadgeCellConfig}. */
	Badge: 'badge',
	/** Avatar / thumbnail — see {@link ImageCellConfig}. */
	Image: 'image',
	/** Anchor rendered from the cell value. */
	Link: 'link',
	/** Progress bar — see {@link ProgressCellConfig}. */
	Progress: 'progress',
} as const

export type BuiltInCellType = (typeof BuiltInCellType)[keyof typeof BuiltInCellType]

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

/**
 * A renderer slot for a column's **input** components — the filter control, the edit field, the
 * create field.
 *
 * Identical to {@link ColumnRenderer} except that its props are compared **bivariantly**, via the
 * method-signature form. That is deliberate and load-bearing.
 *
 * These slots hand the component the column's `cell.config`, whose type is only known to the
 * author: `filtering` and `cell` are sibling fields of one column object, and a union arm has no
 * inference variable to carry a type from one to the other. So the only way to say "this filter
 * reads a `SelectCellConfig`" is to annotate the component — and under `strictFunctionTypes` a
 * property-position function type rejects exactly that annotation, because `config?: unknown` is
 * not assignable to `config?: SelectCellConfig`. The result was that the `config` these slots have
 * always been passed could only be read through a cast, which is the very thing
 * {@link InputComponentProps} exists to remove.
 *
 * Bivariance is what React's own component types give props for the same reason. The narrowing an
 * author writes here is a claim about their own column, not something the grid can check.
 */
export type ColumnInputRenderer<TProps, TNode> =
	| { bivariantRender(props: TProps): TNode }['bivariantRender']
	| ExoticComponentLike

export type CellViewCtx<TRow, TValue> = {
	row: TRow
	value: TValue
	rowIndex: number
}

/**
 * Props passed to a column-level filter input (`column.filtering.component`).
 *
 * `config` is the column's own `cell.config`, forwarded verbatim — a custom filter for a
 * `select` / `badge` column needs the very `items` the cell was declared with, and the grid
 * has been passing them all along.
 *
 * Annotate the component to name that config — `(props: InputComponentProps<SelectCellConfig>)`
 * — and the slot accepts it: {@link ColumnInputRenderer} compares these props bivariantly for
 * precisely this reason. Left unannotated, `config` is `unknown`, as it must be.
 *
 * This is the shape of a **column's** `filtering.component`. A cell type registered in the kit's
 * registry receives the richer `FieldState` in every one of its slots — `view` excepted — because
 * a registered type also renders edit and create fields, where validation state is part of the
 * job.
 */
export type InputComponentProps<TConfig = unknown> = {
	value: unknown
	onChange: (value: unknown) => void
	/** The column's `cell.config`, when it declared one. */
	config?: TConfig
}

// ── cell config types ─────────────────────────────────────────────────────

export type SelectItem = {
	value: string
	label: string
}
/**
 * Visual variant of a badge rendered by the `badge` cell type. The names are the kits' shared
 * badge vocabulary, not a colour — each kit maps them to its own palette.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `variant: 'destructive'` is equally valid and needs no import.
 */
export const BadgeVariant = {
	/** The kit's primary/filled badge. */
	Default: 'default',
	/** Muted badge for supporting information. */
	Secondary: 'secondary',
	/** Error / danger badge. */
	Destructive: 'destructive',
	/** Outlined badge with no fill. */
	Outline: 'outline',
} as const

export type BadgeVariant = (typeof BadgeVariant)[keyof typeof BadgeVariant]

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

/**
 * Where a `link` cell's anchor opens.
 *
 * `_self` is the default because a grid links inside its own app far more often than out of it,
 * and `_blank` — the previous hard-coded behaviour — is the exception you now have to ask for.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `target: '_blank'` is equally valid and needs no import.
 */
export const LinkTarget = {
	/** Navigate in the current tab. The default. */
	Self: '_self',
	/** Open a new tab. Rendered with `rel="noreferrer"`. */
	Blank: '_blank',
} as const

export type LinkTarget = (typeof LinkTarget)[keyof typeof LinkTarget]

/** The placeholder {@link LinkCellConfig.href} substitutes the cell value into. */
export const LINK_HREF_VALUE_TOKEN = '{value}'

/**
 * Config for the `link` cell type.
 *
 * It had none, so the anchor's text was always the raw URL and the target was always a new tab.
 * "Customer name, linking to `/customers/:id`, in this tab" — the ordinary case — had to give up
 * the cell type and write a `cell.component` instead.
 *
 * Everything here is a plain value rather than a callback on purpose. A cell type's config lives
 * in the kit's registry, which is row-agnostic by construction, so a callback declared here would
 * be handed `row: unknown` and every call site would open with a cast. The row-derived cases stay
 * where the row is actually typed: `cell.component`.
 */
export type LinkCellConfig = {
	/**
	 * Fixed anchor text — `'Open'`, `'View invoice'`. Defaults to the cell value.
	 *
	 * For text derived from another field, use `cell.component`: that slot is declared on the
	 * column, so it sees the row's real type.
	 */
	label?: string
	/**
	 * URL template. `{value}` is replaced by the cell value, so a column of ids becomes a column
	 * of links without leaving the cell type:
	 *
	 * ```ts
	 * { accessorKey: 'customerId', cell: { type: 'link', config: { href: '/customers/{value}' } } }
	 * ```
	 *
	 * The template literal type requires the token, so a template that forgot it — and would
	 * therefore point every row at the same page — does not compile. Omitted, the value is the
	 * href, which is what a column that already holds URLs wants.
	 */
	href?: `${string}${typeof LINK_HREF_VALUE_TOKEN}${string}`
	/** Browsing context to open in. Default: {@link LinkTarget.Self}. */
	target?: LinkTarget
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
	min?: string
	/** ISO 8601 date string forwarded to the UI-kit date picker as a hard maximum. */
	max?: string
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
	link: { __config?: LinkCellConfig }
	progress: { __config?: ProgressCellConfig }
}

/**
 * Compile-time proof that {@link BuiltInCellType}'s members and {@link BaseCellTypes}' keys are
 * the *same* set, in both directions. `satisfies` on the array below only proves one of them —
 * an id added to the contract and forgotten here would still compile.
 */
type _BuiltInCellTypeCoversContract = [BuiltInCellType] extends [keyof BaseCellTypes]
	? [keyof BaseCellTypes] extends [BuiltInCellType]
		? true
		: never
	: never
const _builtInCellTypesMatchContract: _BuiltInCellTypeCoversContract = true
void _builtInCellTypesMatchContract

/**
 * {@link BaseCellTypes}' ids at runtime — what the unbound column helper builds methods from.
 *
 * Derived from {@link BuiltInCellType} rather than re-listed, so the members, the union and
 * this array cannot drift apart.
 */
export const BASE_CELL_TYPE_IDS: readonly (keyof BaseCellTypes)[] = Object.values(BuiltInCellType)

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
	// The scalar: a type id and nothing else, which is what most columns want. Same
	// scalar-or-object shape as `align`, `width` and `pinning` — one word for the common case,
	// the object for the exception that carries a `config` or a `component`.
	| (keyof TCellTypes & string)
	| {
			type?: undefined
			config?: undefined
			component?: ColumnRenderer<CellViewCtx<TRow, TValue>, TNode>
	  }
	| {
			[TKey in keyof TCellTypes & string]: CellArm<TKey, TCellTypes[TKey], TRow, TValue, TNode>
	  }[keyof TCellTypes & string]

export type ColumnFilteringConfig<TNode = unknown, TConfig = unknown> = {
	/**
	 * Custom filter input component for this column.
	 *
	 * Receives {@link InputComponentProps}, including the column's own `cell.config`. Annotate
	 * the component with the config it expects — `(props: InputComponentProps<SelectCellConfig>)`
	 * — to read it without a cast.
	 */
	component?: ColumnInputRenderer<InputComponentProps<TConfig>, TNode>
	/** Operator configuration. `true` = default operators for the column's cell type. */
	operators?: boolean | ColumnOperatorsConfig
	/** Override the default selected operator for this column. */
	defaultOperator?: string
	/**
	 * Explicit value list for multi-value (`in` / `notIn`) filters. Wins over both
	 * `cell.config.items` (for `select` / `badge` cell types) and faceted values.
	 *
	 * Named `items`, like `cell.config.items` it overrides — one column, one word for "the
	 * values this column can take". It was `options`, which forced an author writing both slots
	 * on the same column to remember two spellings of one list, and which reused the word this
	 * config already spends on everything you configure.
	 */
	items?: FilterItem[]
	/**
	 * Per-column override for faceted unique values / counts. When `true`, this
	 * column reads `column.getFacetedUniqueValues()` regardless of the table-level
	 * `filtering.faceted` flag. When `false`, this column never uses faceted data
	 * even if the table-level flag is on.
	 */
	faceted?: boolean
}

export type ColumnEditingConfig<TNode = unknown, TValue = unknown, TConfig = unknown> = {
	/**
	 * Custom edit input component for this column.
	 *
	 * Receives a {@link FieldState} with `value`, `onChange`, `onBlur`, `error`, `errors`,
	 * `isValidating`, `config`. On an `accessorKey` column `value` is that field's type; annotate
	 * the component — `(props: FieldState<SelectCellConfig>)` — to name the `cell.config` it reads.
	 */
	component?: ColumnInputRenderer<FieldState<TConfig, TValue>, TNode>
	/**
	 * Help text rendered under the input in the edit form.
	 * Forwarded to `FieldState.description` so composite cell types can show it
	 * via the kit's `<FieldDescription>` / `<Description>` slot.
	 */
	description?: string
	/**
	 * When this column's field validates, overriding the feature-level
	 * `editing.validateOn`. Per-field UX: an email that validates on blur next to a password
	 * that validates on change for a live strength meter.
	 */
	validateOn?: ValidateOn
	/**
	 * Debounce (ms) for this column's validation, overriding the feature-level
	 * `editing.debounce`. Applies only when the resolved `validateOn` is
	 * {@link ValidateOn.Change}.
	 *
	 * One word for "how long we wait before acting on typing", the same one
	 * `filtering.debounce` and `globalFiltering.debounce` use. The unit is milliseconds
	 * everywhere, so it is not part of the name.
	 */
	debounce?: number
}

export type ColumnCreatingConfig<TRow = unknown, TValue = unknown, TNode = unknown, TConfig = unknown> = {
	/**
	 * Custom create input component for this column. Falls back to `editing.component` when omitted.
	 * Receives a {@link FieldState} with the same shape as {@link ColumnEditingConfig.component}.
	 */
	component?: ColumnInputRenderer<FieldState<TConfig, TValue>, TNode>
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
	/**
	 * When this column's field validates, overriding the feature-level
	 * `creating.validateOn`. Falls back to this column's `editing.validateOn` when omitted, the same way
	 * `creating.component` falls back to `editing.component`.
	 */
	validateOn?: ValidateOn
	/**
	 * Debounce (ms) for this column's validation, overriding the feature-level
	 * `creating.debounce`. Applies only when the resolved `validateOn` is
	 * {@link ValidateOn.Change}. Same word, same unit, as `editing.debounce` and
	 * `filtering.debounce`.
	 */
	debounce?: number
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
	/**
	 * Seeds `initialState.columnPinning` — starts pinned, and the user unpins or re-pins it
	 * from the column menu.
	 *
	 * That menu belongs to the **table**-level `pinning` feature. With `pinning` off the seed
	 * still applies — it is what the author wrote, and dropping it silently would be worse —
	 * but there is no menu to change it from, so it behaves exactly like the static
	 * {@link ColumnPinningDef.side}. `createTable` warns about that in development.
	 */
	initialSide?: ColumnPinSide
}

export type ColumnVisibilityDef = {
	/**
	 * Seeds `initialState.columnVisibility` — starts hidden, and the user toggles it back on.
	 *
	 * That toggle belongs to the **table**-level `visibility` feature. With `visibility` off
	 * the seed still applies, so the column starts hidden and stays hidden for good — a
	 * legitimate way to keep a column in the model without showing it (its values still feed
	 * global search), but rarely what someone writing `initialHidden` means. `createTable`
	 * warns about that in development.
	 */
	initialHidden?: boolean
}

/**
 * The sort functions TanStack ships, addressable by name from `column.sorting.fn`.
 *
 * Named members for internal reference; the option is typed as the plain string union (with a
 * `string & {}` tail for custom registry ids), so `sorting: { fn: 'datetime' }` is equally
 * valid and needs no import.
 */
export const BuiltInSortingFn = {
	/** Mixed text/number, case-insensitive. TanStack's default for string columns. */
	Alphanumeric: 'alphanumeric',
	/** As {@link BuiltInSortingFn.Alphanumeric}, case-sensitive. */
	AlphanumericCaseSensitive: 'alphanumericCaseSensitive',
	/** Pure text, case-insensitive. */
	Text: 'text',
	/** Pure text, case-sensitive. */
	TextCaseSensitive: 'textCaseSensitive',
	/** `Date` / date-like values by timestamp. */
	Datetime: 'datetime',
	/** Plain `<` / `>` comparison. */
	Basic: 'basic',
} as const

export type BuiltInSortingFn = (typeof BuiltInSortingFn)[keyof typeof BuiltInSortingFn]

/**
 * Where `undefined` values land during a sort.
 *
 * The const object carries the two named positions. `false` — the absence of any special
 * placement, i.e. treat `undefined` as `0` — is the union's third arm and deliberately gets
 * no member: it is not a position, so naming it would invent a name for something that has
 * none. It reads as the same `false` every other per-column switch takes.
 *
 * TanStack's raw `sortUndefined` numbers (`-1` / `1`) are **not** accepted. They were, and
 * that left one concept with four spellings — `'first'` and `-1` meaning the same thing two
 * columns apart — plus a raw pass-through of TanStack's vocabulary on a grid-level option.
 * `'first'` / `'last'` say which end without anyone having to remember which way the sign
 * points; the mapping to `sortUndefined` happens in `mapColumns`.
 *
 * Named members for internal reference; the option is typed as the plain union, so
 * `undefined: 'last'` is equally valid and needs no import.
 */
export const ColumnSortUndefined = {
	/** `undefined` values sort to the top, whichever direction the column is sorted in. */
	First: 'first',
	/** `undefined` values sort to the bottom, whichever direction the column is sorted in. */
	Last: 'last',
} as const

export type ColumnSortUndefined = (typeof ColumnSortUndefined)[keyof typeof ColumnSortUndefined] | false

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
 * Everything a column def carries except `accessorKey`, with the column's value type as a
 * parameter. The shared body of {@link ColumnDef}'s arms — each arm pairs it with one
 * `accessorKey` and the matching `TValue`.
 *
 * Exported because the column helper has to distribute over the same arms to build its own
 * options type; `Omit` over the finished union cannot do it (see {@link ColumnDef}). Not part
 * of the API anyone writes a column against — that is {@link ColumnDef}.
 */
export type ColumnDefCommon<
	TRow extends object,
	TValue,
	TCellTypes extends CellTypeRegistryShape = BaseCellTypes,
	TNode = unknown,
> = {
	id?: string
	/**
	 * Derive this column's value from the row instead of reading a field.
	 *
	 * Give it an {@link ColumnDefCommon.id}. With no `accessorKey` to build one from, the table
	 * falls back to the `header` when that is a plain string — so the column works, but its id
	 * changes the moment someone rewords the header, invalidating any sorting, filtering or
	 * visibility state keyed to it. With neither, it throws `Columns require an id when using an
	 * accessorFn` on first column access, at render rather than at construction.
	 *
	 * **Written here, the column's `value` is `unknown`** — in `cellClassName`, in
	 * `cell.component`, and in `creating.defaultValue`. `accessorKey` columns get a typed
	 * `value` because each key is its own arm of {@link ColumnDef}'s union, binding the field's
	 * type; a union arm has no inference variable to bind *this* function's return type to.
	 *
	 * For a typed value on a computed column, write it through the column helper's generic
	 * `computed` method, which infers the value type from the function you pass:
	 *
	 * ```ts
	 * col.computed({
	 *   id: 'total',
	 *   accessorFn: (row) => row.price * row.qty, // value: number
	 *   cellClassName: ({ value }) => (value < 0 ? 'text-red-600' : undefined),
	 * })
	 * ```
	 */
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
	 * Not part of the **default** layout — a plain `<DataGrid />` renders no footer row. You do
	 * not read it yourself, though: place `<DataGrid.Footer />` inside a custom
	 * `<DataGrid.Table>` body and it renders every column's `footer` for you, with colSpan,
	 * pinning, alignment and `footerClassName` handled.
	 */
	footer?: string | ColumnRenderer<HeaderContext<TRow, unknown>, TNode>
	columns?: ColumnDef<TRow, TCellTypes, TNode>[]

	/**
	 * Column pinning.
	 * - `'left'` / `'right'` — always pinned to that side (static), no menu section
	 * - `false` — pinning disabled, no pin section in column menu
	 * - `{ initialSide: 'left' }` — starts pinned left, user can change via menu (which requires
	 *   the table-level `pinning` feature — see {@link ColumnPinningDef.initialSide})
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

	/**
	 * Cell display and input configuration.
	 *
	 * - `'number'` — the scalar: a registered cell type, nothing else to say
	 * - `{ type: 'number', config: { … } }` — the type plus its config
	 * - `{ component }` — no type at all, just your own renderer
	 */
	cell?: CellDef<TRow, TValue, TCellTypes, TNode>

	/**
	 * Column visibility configuration.
	 * - `false` — hiding disabled for this column: it is always visible and gets no Hide
	 *   option in the column menu
	 * - `{ initialHidden: true }` — starts hidden, user can toggle it on (which requires the
	 *   table-level `visibility` feature — see {@link ColumnVisibilityDef.initialHidden})
	 *
	 * `false` reads the same as every other per-column switch (`sorting: false`,
	 * `filtering: false`, `editing: false`, `resizing: false`): it turns the feature off
	 * for this column. Note that the *table*-level `visibility` flag is the opposite
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
	editing?: false | ColumnEditingConfig<TNode, TValue>
	/** Column-level creating config. Set to false to disable. */
	creating?: false | ColumnCreatingConfig<TRow, TValue, TNode>

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
	 * direction, and the grid already treats RTL as first-class (the root `direction` option). Column
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
	 * { accessorKey: 'balance', cellClassName: ({ value }) => (value < 0 ? 'text-red-600' : undefined) }
	 * ```
	 */
	cellClassName?: string | ((ctx: CellViewCtx<TRow, TValue>) => string | undefined)
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

/**
 * User-facing column definition for @ez-kit/data-grid.
 * Converted to TanStack ColumnDef via mapColumns().
 *
 * A **union with one member per field of `TRow`**, each binding that field's type as the
 * column's value, plus one accessor-less member where `unknown` is the honest answer. So
 * `{ accessorKey: 'total' }` on a `{ total: number }` row gives `value: number` in
 * `cellClassName`, `cell.component` and `creating.defaultValue` — no cast, no annotation.
 *
 * TypeScript picks the member by the literal `accessorKey`, which is a plain discriminant, so
 * it narrows before reporting: a mistake elsewhere in the column still produces the one-line
 * error it did when this was a single object type, not a wall of union members.
 *
 * The union rides inside the existing type parameters — no new one is added. That is load-
 * bearing: {@link TableConfig.columns} widens the cell-type parameter to `any` precisely so
 * `useDataGrid({ data, columns })` keeps inferring `TRow` from `data`, and a second parameter
 * here would destroy that at every call site.
 *
 * Note for anyone deriving from this type: `Omit<ColumnDef<…>, K>` does **not** work. `Omit`
 * is not distributive and `keyof (A | B)` is the *intersection* of the members' keys, so the
 * result collapses to the few properties every arm shares. Distribute over the arms instead —
 * `create-column-helper.ts`'s `BaseOptions` is the worked example.
 */
export type ColumnDef<TRow extends object, TCellTypes extends CellTypeRegistryShape = BaseCellTypes, TNode = unknown> =
	| {
			[TKey in keyof TRow & string]: ColumnDefCommon<TRow, TRow[TKey], TCellTypes, TNode> & {
				accessorKey: TKey
			}
	  }[keyof TRow & string]
	| (ColumnDefCommon<TRow, unknown, TCellTypes, TNode> & { accessorKey?: undefined })

export type ColumnWidthDef = {
	/** Starting width in pixels. TanStack's `size`. */
	default?: number
	/** Lower bound while resizing, in pixels. TanStack's `minSize`. */
	min?: number
	/** Upper bound while resizing, in pixels. TanStack's `maxSize`. */
	max?: number
}

/**
 * Which auto-injected system column a column def is.
 *
 * Distinct from the `SELECTION_COLUMN_ID` / `EXPAND_COLUMN_ID` / `ACTIONS_COLUMN_ID` constants,
 * which are the columns' `id`s (`'__selection__'`, …). This is the *kind* the React layer
 * switches on to decide what to render, and it is a shorter, stable vocabulary — the ids carry
 * the `__…__` reserved-name convention and are matched against `column.id`, never against
 * `meta.systemColumnType`. Reusing one for both would tie the rendered kind to the reserved-name
 * spelling.
 *
 * Named members for internal reference; the field is typed as the plain string union.
 */
export const SystemColumnType = {
	/** The row-selection checkbox column. */
	Selection: 'selection',
	/** The expand/collapse chevron column. */
	Expand: 'expand',
	/** The per-row actions column — edit, delete, row-pin menu, custom actions. */
	Actions: 'actions',
} as const

export type SystemColumnType = (typeof SystemColumnType)[keyof typeof SystemColumnType]

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
		systemColumnType?: SystemColumnType
		/** Pre-resolved operator list for this column (set when filtering.operators is configured). */
		resolvedOperators?: FilterOperatorDef[]
		/** Between operator UI config passed from filtering.operators.betweenOperator. */
		betweenOperatorConfig?: BetweenOperatorConfig
		/** Default operator ID for this column (derived from config or cell type default). */
		defaultOperatorId?: string
		/** Explicit multi-select value list from `column.filtering.items`. */
		filteringItems?: FilterItem[]
		/**
		 * Effective faceted flag for this column. Set to true when the resolved config
		 * (table-level `filtering.faceted` or column-level `filtering.faceted`) opts in.
		 */
		facetedEnabled?: boolean
	}
}
