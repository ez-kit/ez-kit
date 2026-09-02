import type { BaseCellTypes, SelectItem } from '../../column/types'

/**
 * The filter operators this package ships. A closed set, spelled **once** — the same id means
 * the same comparison whatever the column's cell type is, and only the `label` changes
 * ("Greater than" on a number column, "After" on a date one).
 *
 * That is the whole point of the set. It used to hold three vocabularies at once: text spelled
 * equality `equals` while number and date spelled it `eq`; number spelled comparison
 * `gt` / `gte` / `lt` / `lte` while date spelled it `after` / `onOrAfter` / `before` /
 * `onOrBefore`. One concept, two or three spellings, depending on which column you were
 * looking at — and since {@link createOperatorFilterFn} answers `true` for an id it does not
 * know, `defaultOperator: 'equals'` on a number column produced a filter that silently matched
 * every row.
 *
 * Named members for internal reference; the option is typed as {@link FilterOperatorId}, so
 * `defaultOperator: 'between'` is equally valid and needs no import.
 */
export const FilterOperator = {
	/** Substring match, case-insensitive. Text columns. */
	Contains: 'contains',
	/** Prefix match, case-insensitive. Text columns. */
	StartsWith: 'startsWith',
	/** Suffix match, case-insensitive. Text columns. */
	EndsWith: 'endsWith',
	/** Equality, in the column's own terms. */
	Equals: 'equals',
	/** Inequality, in the column's own terms. */
	NotEquals: 'notEquals',
	/** Strictly after / above. Labelled "Greater than" on numbers, "After" on dates. */
	GreaterThan: 'greaterThan',
	/** At or after / above. Labelled "Greater than or equal" on numbers, "On or after" on dates. */
	GreaterOrEqual: 'greaterOrEqual',
	/** Strictly before / below. Labelled "Less than" on numbers, "Before" on dates. */
	LessThan: 'lessThan',
	/** At or before / below. Labelled "Less than or equal" on numbers, "On or before" on dates. */
	LessOrEqual: 'lessOrEqual',
	/** Inclusive range — takes a {@link BetweenValue}. */
	Between: 'between',
	/** Row value is one of a set. Renders the multi-select filter. */
	In: 'in',
	/** Row value is none of a set. Renders the multi-select filter. */
	NotIn: 'notIn',
	/** Null / undefined / empty string. Renders no value input. */
	IsEmpty: 'isEmpty',
	/** Anything but null / undefined / empty string. Renders no value input. */
	IsNotEmpty: 'isNotEmpty',
} as const

export type FilterOperator = (typeof FilterOperator)[keyof typeof FilterOperator]

/**
 * An operator id: one of the built-in {@link FilterOperator} members, or the id of a custom
 * operator registered through the table-level `filtering.operators`.
 *
 * The `string & {}` tail keeps a custom id assignable while preserving autocomplete for the
 * built-ins — the same shape `column.sorting.fn` uses for {@link BuiltInSortingFn}.
 */
export type FilterOperatorId = FilterOperator | (string & {})

/** Defines a filter operator with its filtering logic. */
export type FilterOperatorDef<TValue = unknown> = {
	id: FilterOperatorId
	label: string
	/** When false, no value input is rendered (e.g. isEmpty). Default: true. */
	requiresInput?: boolean
	filterFn: (rowValue: unknown, filterValue: TValue) => boolean
}

/** Structured filter value stored in TanStack columnFilters[n].value. */
export type StructuredFilterValue = {
	operator: FilterOperatorId
	value: unknown
}

/** Value shape for the between operator. */
export type BetweenValue<T = unknown> = {
	from?: T
	to?: T
}

/**
 * How a between-range filter presents itself.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `variant: 'slider'` is equally valid and needs no import.
 */
export const BetweenInputVariant = {
	/** Two plain bound inputs. The default. */
	Inputs: 'inputs',
	/** A two-handle range slider — requires resolved `min` / `max`. */
	Slider: 'slider',
	/** A date-range calendar. */
	Calendar: 'calendar',
} as const

export type BetweenInputVariant = (typeof BetweenInputVariant)[keyof typeof BetweenInputVariant]

/**
 * What kind of value a between-range filter bounds — which decides how the kit parses and
 * formats each bound. Derived from the column's cell type, not configured directly.
 *
 * Named members for internal reference; the plain string union is what kits see.
 */
export const BetweenInputType = {
	/** Numeric bounds. */
	Number: 'number',
	/** Date bounds. */
	Date: 'date',
} as const

export type BetweenInputType = (typeof BetweenInputType)[keyof typeof BetweenInputType]

/** UI configuration for the between operator. */
export type BetweenOperatorConfig = {
	/** Presentation of the range control. Default: {@link BetweenInputVariant.Inputs}. */
	variant?: BetweenInputVariant
	/** Minimum value for slider variant. */
	min?: number
	/** Maximum value for slider variant. */
	max?: number
	/**
	 * Show preset chips above the between input(s). Only meaningful when the
	 * column's `cell.type === 'date'`.
	 * - `true` — render the built-in {@link DATE_RANGE_PRESETS}
	 * - {@link DateRangePreset}[] — render a custom subset (or extra presets)
	 * - `false` / omitted — no preset row
	 */
	presets?: boolean | DateRangePreset[]
}

/**
 * Date range preset for the `between` operator's date variants.
 *
 * `getRange(now)` returns ISO-8601 date-only strings (`'YYYY-MM-DD'`) so the
 * value is timezone-stable and round-trips through the existing
 * date-as-string fast path in {@link DATE_OPERATORS} (`between`).
 */
export type DateRangePreset = {
	id: string
	label: string
	getRange: (now?: Date) => BetweenValue<string>
}

/** UTC midnight floor for a given `Date`. Keeps arithmetic timezone-stable. */
function toUtcMidnight(d: Date): Date {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** ISO-8601 date-only string (`YYYY-MM-DD`) for a UTC-midnight `Date`. */
function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10)
}

function addDaysUtc(d: Date, days: number): Date {
	const next = new Date(d)
	next.setUTCDate(next.getUTCDate() + days)
	return next
}

function startOfMonthUtc(d: Date): Date {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function endOfMonthUtc(d: Date): Date {
	// Day 0 of next month = last day of current month (UTC).
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
}

/** Built-in date range presets (today / yesterday / last 7d / last 30d / this month / last month). */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
	{
		id: 'today',
		label: 'Today',
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(today), to: isoDate(today) }
		},
	},
	{
		id: 'yesterday',
		label: 'Yesterday',
		getRange: (now = new Date()) => {
			const y = addDaysUtc(toUtcMidnight(now), -1)
			return { from: isoDate(y), to: isoDate(y) }
		},
	},
	{
		id: 'last7',
		label: 'Last 7 days',
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(addDaysUtc(today, -6)), to: isoDate(today) }
		},
	},
	{
		id: 'last30',
		label: 'Last 30 days',
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(addDaysUtc(today, -29)), to: isoDate(today) }
		},
	},
	{
		id: 'thisMonth',
		label: 'This month',
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(startOfMonthUtc(today)), to: isoDate(endOfMonthUtc(today)) }
		},
	},
	{
		id: 'lastMonth',
		label: 'Last month',
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			const lastMonthAnchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
			return { from: isoDate(startOfMonthUtc(lastMonthAnchor)), to: isoDate(endOfMonthUtc(lastMonthAnchor)) }
		},
	},
]

/** Column-level operator configuration when not using the simple `true` shorthand. */
export type ColumnOperatorsConfig = {
	/**
	 * Operator ids referencing the registry, or inline operator definitions. Omit to use all
	 * default operators for the column's cell type.
	 */
	items?: (FilterOperatorId | FilterOperatorDef)[]
	betweenOperator?: BetweenOperatorConfig
}

// ── Built-in text operators ────────────────────────────────────────────────

/**
 * The two emptiness operators, shared verbatim by every cell type's default set.
 *
 * Declared on their own rather than filtered back out of {@link TEXT_OPERATORS} by id, which
 * is what {@link SELECT_BADGE_OPERATORS} used to do — a filter over ids silently yields an
 * empty list the moment an id is renamed.
 */
export const EMPTY_OPERATORS: FilterOperatorDef<never>[] = [
	{
		id: FilterOperator.IsEmpty,
		label: 'Is empty',
		requiresInput: false,
		filterFn: (rowValue) => rowValue == null || rowValue === '',
	},
	{
		id: FilterOperator.IsNotEmpty,
		label: 'Is not empty',
		requiresInput: false,
		filterFn: (rowValue) => rowValue != null && rowValue !== '',
	},
]

export const TEXT_OPERATORS: FilterOperatorDef<string>[] = [
	{
		id: FilterOperator.Contains,
		label: 'Contains',
		filterFn: (rowValue, filterValue) => {
			if (rowValue == null) return false
			return String(rowValue).toLowerCase().includes(filterValue.toLowerCase())
		},
	},
	{
		id: FilterOperator.Equals,
		label: 'Equals',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '').toLowerCase() === filterValue.toLowerCase(),
	},
	{
		id: FilterOperator.NotEquals,
		label: 'Not equals',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '').toLowerCase() !== filterValue.toLowerCase(),
	},
	{
		id: FilterOperator.StartsWith,
		label: 'Starts with',
		filterFn: (rowValue, filterValue) =>
			String(rowValue ?? '')
				.toLowerCase()
				.startsWith(filterValue.toLowerCase()),
	},
	{
		id: FilterOperator.EndsWith,
		label: 'Ends with',
		filterFn: (rowValue, filterValue) =>
			String(rowValue ?? '')
				.toLowerCase()
				.endsWith(filterValue.toLowerCase()),
	},
	...(EMPTY_OPERATORS as FilterOperatorDef<string>[]),
]

// ── Built-in number operators ──────────────────────────────────────────────

export const NUMBER_OPERATORS: FilterOperatorDef<number>[] = [
	{
		id: FilterOperator.Equals,
		label: 'Equals',
		filterFn: (rowValue, filterValue) => Number(rowValue) === filterValue,
	},
	{
		id: FilterOperator.NotEquals,
		label: 'Not equals',
		filterFn: (rowValue, filterValue) => Number(rowValue) !== filterValue,
	},
	{
		id: FilterOperator.GreaterThan,
		label: 'Greater than',
		filterFn: (rowValue, filterValue) => Number(rowValue) > filterValue,
	},
	{
		id: FilterOperator.GreaterOrEqual,
		label: 'Greater than or equal',
		filterFn: (rowValue, filterValue) => Number(rowValue) >= filterValue,
	},
	{
		id: FilterOperator.LessThan,
		label: 'Less than',
		filterFn: (rowValue, filterValue) => Number(rowValue) < filterValue,
	},
	{
		id: FilterOperator.LessOrEqual,
		label: 'Less than or equal',
		filterFn: (rowValue, filterValue) => Number(rowValue) <= filterValue,
	},
	{
		id: FilterOperator.Between,
		label: 'Between',
		filterFn: (rowValue, filterValue) => {
			const val = Number(rowValue)
			const fv = filterValue as unknown as BetweenValue<number>
			if (fv.from !== undefined && val < fv.from) return false
			if (fv.to !== undefined && val > fv.to) return false
			return true
		},
	},
]

// ── Built-in multi-value operators (in / notIn) ────────────────────────────

/** Option shape used by multi-value (`in` / `notIn`) filter inputs. */
/**
 * One entry in a multi-value (`in` / `notIn`) filter's list.
 *
 * `SelectItem` plus the faceted count, and named `*Item` like every other "one of the values
 * this column can take" list in the API — `cell.config.items`, `filtering.items`. The word
 * `option` is spoken for: on this grid an option is something you configure, and one noun
 * cannot be both.
 */
export type FilterItem = SelectItem & {
	/** Optional faceted count — number of rows matching this value in current data. */
	count?: number
}

export const IN_OPERATORS: FilterOperatorDef<string[]>[] = [
	{
		id: FilterOperator.In,
		label: 'Is any of',
		filterFn: (rowValue, filterValue) => {
			if (!Array.isArray(filterValue) || filterValue.length === 0) return true
			const v = rowValue == null ? '' : String(rowValue)
			return filterValue.includes(v)
		},
	},
	{
		id: FilterOperator.NotIn,
		label: 'Is none of',
		filterFn: (rowValue, filterValue) => {
			if (!Array.isArray(filterValue) || filterValue.length === 0) return true
			const v = rowValue == null ? '' : String(rowValue)
			return !filterValue.includes(v)
		},
	},
]

// ── Built-in date operators ────────────────────────────────────────────────

/**
 * Date operators. The ids are the shared {@link FilterOperator} members — the same comparison
 * a number column makes — and only the labels speak calendar ("After", not "Greater than").
 */
export const DATE_OPERATORS: FilterOperatorDef<string>[] = [
	{
		id: FilterOperator.Equals,
		label: 'Equals',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') === filterValue,
	},
	{
		id: FilterOperator.NotEquals,
		label: 'Not equals',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') !== filterValue,
	},
	{
		id: FilterOperator.GreaterThan,
		label: 'After',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') > filterValue,
	},
	{
		id: FilterOperator.GreaterOrEqual,
		label: 'On or after',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') >= filterValue,
	},
	{
		id: FilterOperator.LessThan,
		label: 'Before',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') < filterValue,
	},
	{
		id: FilterOperator.LessOrEqual,
		label: 'On or before',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') <= filterValue,
	},
	{
		id: FilterOperator.Between,
		label: 'Between',
		filterFn: (rowValue, filterValue) => {
			const val = String(rowValue ?? '')
			const fv = filterValue as unknown as BetweenValue<string>
			if (fv.from !== undefined && fv.from !== '' && val < fv.from) return false
			if (fv.to !== undefined && fv.to !== '' && val > fv.to) return false
			return true
		},
	},
]

// ── Built-in boolean operators ────────────────────────────────────────────

/** Coerces a filter value written as a checkbox state or as its string form. */
function toBoolean(value: unknown): boolean {
	return value === true || value === 'true'
}

/**
 * Boolean operators. Equality only — a boolean has no ordering — plus the shared emptiness
 * pair, which is what distinguishes "false" from "never set" on an optional field.
 *
 * The value control is the kit's registered `boolean` filter input, reached through the cell
 * type registry like every other operator-aware column.
 */
export const BOOLEAN_OPERATORS: FilterOperatorDef<boolean>[] = [
	{
		id: FilterOperator.Equals,
		label: 'Is',
		filterFn: (rowValue, filterValue) => Boolean(rowValue) === toBoolean(filterValue),
	},
	{
		id: FilterOperator.NotEquals,
		label: 'Is not',
		filterFn: (rowValue, filterValue) => Boolean(rowValue) !== toBoolean(filterValue),
	},
	...(EMPTY_OPERATORS as FilterOperatorDef<boolean>[]),
]

// ── Lookup tables ─────────────────────────────────────────────────────────

export const SELECT_BADGE_OPERATORS: FilterOperatorDef[] = [
	...(IN_OPERATORS as FilterOperatorDef[]),
	...(EMPTY_OPERATORS as FilterOperatorDef[]),
]

/**
 * The default operator list per cell type — what `column.filtering.operators: true` resolves to.
 *
 * Every built-in cell type has an entry. Four of them (`boolean`, `progress`, `image`, `link`)
 * had none, and since a missing entry made `resolveColumnOperators` return `[]`,
 * `operators: true` on such a column attached no `filterFn`, published no operator list and
 * warned about nothing — the option read as "give me the defaults for my type" and did
 * nothing at all. `progress` is a number and `image` / `link` hold strings, so each of them
 * had a set already; they just were not wired to it.
 *
 * Keyed by `string` rather than `BuiltInCellType` because a project-registered cell type is
 * looked up here too. The `satisfies` clause is what keeps the built-ins exhaustive: the
 * index signature alone is exactly what let four of them go missing without an error.
 */
export const DEFAULT_OPERATORS_BY_TYPE: Record<string, FilterOperatorDef[]> = {
	text: TEXT_OPERATORS as FilterOperatorDef[],
	number: NUMBER_OPERATORS as FilterOperatorDef[],
	date: DATE_OPERATORS as FilterOperatorDef[],
	boolean: BOOLEAN_OPERATORS as FilterOperatorDef[],
	select: SELECT_BADGE_OPERATORS,
	badge: SELECT_BADGE_OPERATORS,
	progress: NUMBER_OPERATORS as FilterOperatorDef[],
	image: TEXT_OPERATORS as FilterOperatorDef[],
	link: TEXT_OPERATORS as FilterOperatorDef[],
} satisfies Record<keyof BaseCellTypes, FilterOperatorDef[]>

/** The operator each cell type opens with. Exhaustive over the built-ins, like the map above. */
export const DEFAULT_OPERATOR_ID_BY_TYPE: Record<string, FilterOperatorId> = {
	text: FilterOperator.Contains,
	number: FilterOperator.Equals,
	date: FilterOperator.Equals,
	boolean: FilterOperator.Equals,
	select: FilterOperator.In,
	badge: FilterOperator.In,
	progress: FilterOperator.Equals,
	image: FilterOperator.Contains,
	link: FilterOperator.Contains,
} satisfies Record<keyof BaseCellTypes, FilterOperatorId>

// ── Registry ──────────────────────────────────────────────────────────────

export type OperatorRegistry = Map<string, FilterOperatorDef>

/**
 * Flattened built-ins, in registry-insertion order: later entries win an id collision.
 *
 * Collisions are now the rule rather than the exception — `equals` means equality on all four
 * of text, number, date and boolean, which is the point of {@link FilterOperator}. The
 * per-column path never reads this map for an id the column's own cell type defines
 * (`resolveColumnOperators` consults `cellTypeOperators` first), so this order only decides
 * what a **custom** cell type gets when it names a shared id. Text goes last, and therefore
 * wins: its comparisons stringify, which is the one behaviour that is defined for any value.
 */
const ALL_BUILT_INS: FilterOperatorDef[] = [
	...(NUMBER_OPERATORS as FilterOperatorDef[]),
	...(DATE_OPERATORS as FilterOperatorDef[]),
	...(BOOLEAN_OPERATORS as FilterOperatorDef[]),
	...(IN_OPERATORS as FilterOperatorDef[]),
	...(TEXT_OPERATORS as FilterOperatorDef[]),
]

/** Builds the global registry from built-ins + optional table-level custom operators. */
export function buildOperatorRegistry(tableOperators?: FilterOperatorDef[]): OperatorRegistry {
	const registry = new Map<string, FilterOperatorDef>()
	for (const op of ALL_BUILT_INS) registry.set(op.id, op)
	if (tableOperators) {
		for (const op of tableOperators) registry.set(op.id, op)
	}
	return registry
}

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Resolves the final operator list for a column from its config.
 *
 * Prefers cell-type-specific operators over the global registry for same-id lookups, so
 * `equals` on a number column compares numbers and `equals` on a date column compares dates.
 * That is what makes one {@link FilterOperator} vocabulary work across cell types.
 *
 * An id that resolves to nothing still yields a pass-through stub — the column keeps working
 * — but it warns in development. Silently, this was the sharpest edge in the whole filtering
 * API: {@link createOperatorFilterFn} answers `true` for an operator it does not know, so a
 * mistyped or wrong-vocabulary id produced a filter the user could type into that matched
 * every row, with no error anywhere.
 */
export function resolveColumnOperators(
	operatorsConfig: true | ColumnOperatorsConfig,
	registry: OperatorRegistry,
	cellTypeOperators?: FilterOperatorDef[],
	/** Column id, for the development warnings only. */
	columnId?: string,
): FilterOperatorDef[] {
	if (operatorsConfig === true || !operatorsConfig.items) {
		return cellTypeOperators ?? []
	}

	const cellTypeById = cellTypeOperators ? new Map(cellTypeOperators.map((op) => [op.id, op])) : undefined

	return operatorsConfig.items.map((item): FilterOperatorDef => {
		if (typeof item !== 'string') return item
		const resolved = cellTypeById?.get(item) ?? registry.get(item)
		if (resolved) return resolved
		if (IS_DEV) {
			console.warn(
				`[data-grid] Column "${columnId ?? '?'}" lists filter operator "${item}", which is neither a ` +
					`built-in nor registered through the table-level \`filtering.operators\`. It will match every ` +
					`row. Built-in ids are the \`FilterOperator\` members.`,
			)
		}
		return { id: item, label: item, filterFn: () => true }
	})
}

/**
 * Creates a per-column TanStack filterFn that dispatches to the resolved operator's filterFn.
 * Returns true (all rows pass) when filter value is empty or operator is not found.
 */
export function createOperatorFilterFn(resolvedOperators: FilterOperatorDef[]): {
	(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown): boolean
	autoRemove: (val: unknown) => boolean
} {
	const opById = new Map(resolvedOperators.map((op) => [op.id, op]))

	const fn = (row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown): boolean => {
		if (filterValue == null || typeof filterValue !== 'object' || !('operator' in filterValue)) return true
		const sv = filterValue as StructuredFilterValue
		const op = opById.get(sv.operator)
		if (!op) return true
		if (op.requiresInput === false) return op.filterFn(row.getValue(columnId), undefined)
		if (sv.value === undefined || sv.value === null || sv.value === '') return true
		if (Array.isArray(sv.value) && sv.value.length === 0) return true
		return op.filterFn(row.getValue(columnId), sv.value)
	}

	fn.autoRemove = (val: unknown): boolean => {
		if (val == null) return true
		if (typeof val !== 'object') return true
		const sv = val as StructuredFilterValue
		if (!sv.operator) return true
		const op = opById.get(sv.operator)
		if (!op) return true
		// Keep entry while operator is selected; filterFn returns true for empty value.
		return false
	}

	return fn
}
