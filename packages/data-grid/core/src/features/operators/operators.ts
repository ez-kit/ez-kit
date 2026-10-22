import { defaultMessages } from '../../messages'
import { warnOnce } from '../../utils/warn-once'

import { OperatorInput } from './input'

import type { SelectItem } from '../../column/types'
import type { GridMessages } from '../../messages'
import type { FilterOperator } from '../../operators/ids'

export { OperatorInput } from './input'

/**
 * An operator id: one of the ready-made set's {@link FilterOperator} ids, or any id an operator
 * set names.
 *
 * The `string & {}` tail keeps a custom id assignable while preserving autocomplete for the
 * ready-made ones — the same shape `column.sorting.fn` uses for {@link BuiltInSortingFn}.
 */
export type FilterOperatorId = FilterOperator | (string & {})

/** What every operator definition carries, whatever value it takes. */
type FilterOperatorBase = {
	/**
	 * What a filter value names the operator by — `{ operator: 'equals', value: 5 }`. Unique within
	 * one cell type's set; the same id in two types' sets may compare differently.
	 */
	id: FilterOperatorId
	/** What the operator control, its menu, the active-filter chip and the filter model show. */
	label: string
	/**
	 * Optional glyph the operator's control shows instead of its label — React: `icon: '≈'` or
	 * `icon: <Waves />`. The definition is the only source of an operator's icon; without one, the
	 * control shows `label`.
	 *
	 * Typed `unknown` for the reason `SelectItem.icon` is: core renders nothing and must not name
	 * a framework's node type.
	 */
	icon?: unknown
}

/**
 * Defines a filter operator: its id, its label, the kind of value it takes and the comparison.
 *
 * A union over the required {@link OperatorInput} `input`, which decides the shape `filterFn` is
 * given — nothing for `none`, one `TValue` for `single`, a {@link BetweenValue} for `range`, an
 * array for `list`. `input` is required because it is the discriminant: without it TypeScript does
 * not reliably narrow the callback's contextual type, and the grid would have no way to tell a
 * range operator from a single-value one other than by its id, which is the defect this replaced.
 *
 * `filterFn` is declared as a **method** on purpose. Method parameters are bivariant, so a
 * `FilterOperatorDef<number>` is assignable to `FilterOperatorDef[]` without a cast — the grid hands
 * every operator the row value as `unknown` anyway, and the guarantee that matters is the value's
 * shape, which `input` fixes. The grid never calls `filterFn` with an empty value unless `input` is
 * `none`.
 */
export type FilterOperatorDef<TValue = unknown> = FilterOperatorBase &
	(
		| {
				input: typeof OperatorInput.None
				filterFn(rowValue: unknown): boolean
		  }
		| {
				input: typeof OperatorInput.Single
				filterFn(rowValue: unknown, value: TValue): boolean
		  }
		| {
				input: typeof OperatorInput.Range
				filterFn(rowValue: unknown, value: BetweenValue<TValue>): boolean
		  }
		| {
				input: typeof OperatorInput.List
				filterFn(rowValue: unknown, value: readonly TValue[]): boolean
		  }
	)

/**
 * The operators a grid offers, by cell type — a bundle decision, passed to `createDataGrid` the way
 * `features` is, or set in any options layer.
 *
 * It switches nothing on: a column offers operators only when `filtering.operators` (its own or the
 * table's) says so. A layer above replaces the set of each cell type it names and keeps the rest.
 */
export type OperatorsConfig = {
	/**
	 * Cell type → the operators a column of that type offers, in order. A cell type with no entry
	 * offers none, which is what a project-registered type gets until it is listed here.
	 */
	byType?: Partial<Record<string, FilterOperatorDef[]>>
	/**
	 * Cell type → the operator a column of that type opens with. Without an entry a column opens
	 * with the first operator of its set; a column's own `filtering.defaultOperator` beats both.
	 */
	defaultByType?: Partial<Record<string, FilterOperatorId>>
}

/** Structured filter value stored in TanStack columnFilters[n].value. */
export type StructuredFilterValue = {
	operator: FilterOperatorId
	value: unknown
}

/** The value an operator with `input: 'range'` takes — `between`, or an author's `notBetween`. */
export type BetweenValue<T = unknown> = {
	from?: T
	to?: T
}

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

/**
 * UI configuration for the range control — what every operator with `input: 'range'` renders.
 *
 * Number-only, and that is the whole type: nothing here says how the control looks — that is the
 * kit's business — and the date side has nothing to configure here either. Date presets are not a `between` thing: they fill
 * whichever operator is current, so they live on the column's `filtering.presets`.
 */
export type BetweenOperatorConfig = {
	/**
	 * Render the range as a two-handle slider. Requires both {@link BetweenOperatorConfig.min} and
	 * {@link BetweenOperatorConfig.max}: a slider over an unknown domain can express nothing, so
	 * without them the control falls back to two number fields and warns in development.
	 */
	slider?: boolean
	/** Lower bound. Clamps the number fields, and is the slider's floor. */
	min?: number
	/** Upper bound. Clamps the number fields, and is the slider's ceiling. */
	max?: number
}

/**
 * A preset that fills a date **range** — any operator with `input: 'range'`.
 *
 * `getRange(now)` returns ISO-8601 date-only strings (`'YYYY-MM-DD'`) so the value is
 * timezone-stable and round-trips through the ready-made date operators, which compare
 * date-only strings.
 */
export type DateRangePreset = {
	id: string
	label: string
	getRange: (now?: Date) => BetweenValue<string>
}

/**
 * A preset that fills a **single** date — every date operator with `input: 'single'` (`equals`,
 * `lessThan`, `greaterThan`, …).
 *
 * A range preset cannot serve those: "Last 7 days" has no single date to mean, and picking one of
 * its ends silently turns "the last week" into "after last Tuesday". The two kinds are separate
 * types so a control can offer only the ones its current operator can actually take.
 */
export type DateValuePreset = {
	id: string
	label: string
	getDate: (now?: Date) => string
}

/** Either kind of date preset — what a column's `filtering.presets` holds. */
export type DatePreset = DateRangePreset | DateValuePreset

/** Narrows a {@link DatePreset} to the half that fills both ends of a range. */
export function isDateRangePreset(preset: DatePreset): preset is DateRangePreset {
	return 'getRange' in preset
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
		label: defaultMessages.filtering.presets.today,
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(today), to: isoDate(today) }
		},
	},
	{
		id: 'yesterday',
		label: defaultMessages.filtering.presets.yesterday,
		getRange: (now = new Date()) => {
			const y = addDaysUtc(toUtcMidnight(now), -1)
			return { from: isoDate(y), to: isoDate(y) }
		},
	},
	{
		id: 'last7',
		label: defaultMessages.filtering.presets.last7,
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(addDaysUtc(today, -6)), to: isoDate(today) }
		},
	},
	{
		id: 'last30',
		label: defaultMessages.filtering.presets.last30,
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(addDaysUtc(today, -29)), to: isoDate(today) }
		},
	},
	{
		id: 'thisMonth',
		label: defaultMessages.filtering.presets.thisMonth,
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return { from: isoDate(startOfMonthUtc(today)), to: isoDate(endOfMonthUtc(today)) }
		},
	},
	{
		id: 'lastMonth',
		label: defaultMessages.filtering.presets.lastMonth,
		getRange: (now = new Date()) => {
			const today = toUtcMidnight(now)
			const lastMonthAnchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
			return { from: isoDate(startOfMonthUtc(lastMonthAnchor)), to: isoDate(endOfMonthUtc(lastMonthAnchor)) }
		},
	},
]

/**
 * The built-in single-date presets, for the operators that take one value.
 *
 * Deliberately not the range list with an end picked off it: `today` and `yesterday` are the only
 * two that mean the same thing either way, and the rest ("Last 7 days") would have to be bent into
 * a date they do not name.
 */
export const DATE_VALUE_PRESETS: DateValuePreset[] = [
	{
		id: 'today',
		label: defaultMessages.filtering.presets.today,
		getDate: (now = new Date()) => isoDate(toUtcMidnight(now)),
	},
	{
		id: 'yesterday',
		label: defaultMessages.filtering.presets.yesterday,
		getDate: (now = new Date()) => isoDate(addDaysUtc(toUtcMidnight(now), -1)),
	},
	{
		id: 'weekAgo',
		label: defaultMessages.filtering.presets.weekAgo,
		getDate: (now = new Date()) => isoDate(addDaysUtc(toUtcMidnight(now), -7)),
	},
	{
		id: 'monthAgo',
		label: defaultMessages.filtering.presets.monthAgo,
		getDate: (now = new Date()) => {
			const today = toUtcMidnight(now)
			return isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, today.getUTCDate())))
		},
	},
	{
		id: 'startOfMonth',
		label: defaultMessages.filtering.presets.startOfMonth,
		getDate: (now = new Date()) => isoDate(startOfMonthUtc(toUtcMidnight(now))),
	},
]

/** Column-level operator configuration when not using the simple `true` shorthand. */
export type ColumnOperatorsConfig = {
	/**
	 * The operators this column offers, narrowing its cell type's set. A string is an id looked up
	 * in **that** set — the grid's `operators.byType[cellType]` — and nowhere else; a definition is
	 * used as written. Omit to offer the whole set.
	 */
	items?: (FilterOperatorId | FilterOperatorDef)[]
	betweenOperator?: BetweenOperatorConfig
}

/**
 * One entry in a multi-value (`input: 'list'`) filter's list.
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

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Resolves the final operator list for a column from its config and its cell type's set.
 *
 * `cellTypeOperators` is the grid's `operators.byType[cellType]`. A string in the column's `items`
 * is looked up there and only there: the same id may compare differently in another type's set, so
 * borrowing one would hand a number column a string comparison under a familiar name.
 *
 * An id that resolves to nothing still yields a pass-through stub — the column keeps working
 * — but it warns in development. Silently, this was the sharpest edge in the whole filtering
 * API: a mistyped or wrong-type id produced a filter the user could type into that matched every
 * row, with no error anywhere.
 */
export function resolveColumnOperators(
	operatorsConfig: true | ColumnOperatorsConfig,
	cellTypeOperators: FilterOperatorDef[] | undefined,
	/** Column id and cell type, for the development warnings only. */
	columnId?: string,
	cellType?: string,
): FilterOperatorDef[] {
	if (operatorsConfig === true || !operatorsConfig.items) return cellTypeOperators ?? []

	const cellTypeById = new Map((cellTypeOperators ?? []).map((op) => [op.id, op]))

	return operatorsConfig.items.map((item): FilterOperatorDef => {
		if (typeof item !== 'string') return item
		const resolved = cellTypeById.get(item)
		if (resolved) return resolved
		if (IS_DEV) {
			warnOnce(
				`[data-grid] Column "${columnId ?? '?'}" lists filter operator "${item}", which is not in the ` +
					`operator set of its cell type "${cellType ?? 'text'}". It will match every row. Add it to ` +
					`\`operators.byType\`, or list its definition in the column's \`items\`.`,
			)
		}
		return { id: item, label: item, input: OperatorInput.Single, filterFn: () => true }
	})
}

/** A bound of a range that states nothing. */
function isEmptyBound(bound: unknown): boolean {
	return bound === undefined || bound === null || bound === ''
}

/**
 * Whether a filter value states nothing for an operator that takes `input` — the one rule both
 * the row filter and anything that stores filters apply. A value of a shape `input` cannot take
 * (not an array for `list`, not an object for `range`) counts as stating nothing.
 *
 * An operator that takes no value (`none`) is never empty: its whole meaning is the operator.
 */
export function isEmptyOperatorValue(input: OperatorInput, value: unknown): boolean {
	if (input === OperatorInput.None) return false
	if (value === undefined || value === null || value === '') return true
	if (Array.isArray(value) && value.length === 0) return true
	// A value of the wrong shape — a scalar under a list operator, say, restored from a link — states
	// nothing the operator can take, so it filters nothing rather than reaching its `filterFn`.
	if (input === OperatorInput.List) return !Array.isArray(value) || value.length === 0
	if (input === OperatorInput.Range) {
		if (typeof value !== 'object' || Array.isArray(value)) return true
		const range = value as BetweenValue
		return isEmptyBound(range.from) && isEmptyBound(range.to)
	}
	return false
}

/**
 * An operator that takes a value, seen from the one place that calls it. Every non-`none` member of
 * {@link FilterOperatorDef} is one, by method bivariance; the value's shape is the definition's
 * `input`, which the grid wrote the value by.
 */
type ValueOperator = FilterOperatorBase & { filterFn(rowValue: unknown, value: unknown): boolean }

/**
 * Creates a per-column TanStack filterFn that dispatches to the resolved operator's filterFn.
 *
 * All rows pass when the filter value is empty for its operator's `input`, so no operator's
 * `filterFn` has to guard against an empty value itself. All rows pass for an operator the column
 * does not offer, too — a filter restored from a link made against another operator set — and that
 * warns in development, once per id per column rather than once per row.
 */
export function createOperatorFilterFn(
	resolvedOperators: FilterOperatorDef[],
	/** Column id, for the development warning only. */
	columnId?: string,
): {
	(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown): boolean
	autoRemove: (val: unknown) => boolean
} {
	const opById = new Map(resolvedOperators.map((op) => [op.id, op]))

	// `warnOnce` rather than a set in this closure: the dispatcher is rebuilt whenever the column
	// mapper re-runs, which under React is every render.
	const warnUnknown = (id: string): void => {
		if (!IS_DEV) return
		warnOnce(
			`[data-grid] Column "${columnId ?? '?'}" has a filter with operator "${id}", which it does not ` +
				`offer, so the filter matches every row. Keep the id in the column's operator set to keep ` +
				`such filters working.`,
		)
	}

	const fn = (row: { getValue: (id: string) => unknown }, id: string, filterValue: unknown): boolean => {
		if (filterValue == null || typeof filterValue !== 'object' || !('operator' in filterValue)) return true
		const sv = filterValue as StructuredFilterValue
		const op = opById.get(sv.operator)
		if (!op) {
			warnUnknown(String(sv.operator))
			return true
		}
		if (op.input === OperatorInput.None) return op.filterFn(row.getValue(id))
		if (isEmptyOperatorValue(op.input, sv.value)) return true
		return (op as ValueOperator).filterFn(row.getValue(id), sv.value)
	}

	fn.autoRemove = (val: unknown): boolean => {
		if (val == null) return true
		if (typeof val !== 'object') return true
		const sv = val as StructuredFilterValue
		if (!sv.operator) return true
		const op = opById.get(sv.operator)
		if (!op) return true
		// Keep entry while operator is selected; an empty value matches every row.
		return false
	}

	return fn
}

/** Re-labels the built-in date presets from the dictionary's `filtering.presets`. */
export function localizeDatePresets(
	presets: DatePreset[],
	messages: GridMessages['filtering']['presets'],
): DatePreset[] {
	const table = messages as Record<string, string | undefined>
	const next = presets.map((preset) => {
		const label = table[preset.id]
		return label === undefined || label === preset.label ? preset : { ...preset, label }
	})
	return next.some((preset, index) => preset !== presets[index]) ? next : presets
}
