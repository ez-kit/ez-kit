/** Defines a filter operator with its filtering logic. */
export type FilterOperatorDef<TValue = unknown> = {
	id: string
	label: string
	/** Short symbol shown in the trigger button (e.g. '=', '>', '⊇'). */
	symbol?: string
	/** When false, no value input is rendered (e.g. isEmpty). Default: true. */
	requiresInput?: boolean
	filterFn: (rowValue: unknown, filterValue: TValue) => boolean
}

/** Structured filter value stored in TanStack columnFilters[n].value. */
export type StructuredFilterValue = {
	operator: string
	value: unknown
}

/** Value shape for the between operator. */
export type BetweenValue<T = unknown> = {
	from?: T
	to?: T
}

/** UI configuration for the between operator. */
export type BetweenOperatorConfig = {
	variant?: 'inputs' | 'slider' | 'calendar'
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
	/** Operator IDs referencing the registry, or inline operator definitions. Omit to use all default operators for the column's cell type. */
	items?: (string | FilterOperatorDef)[]
	betweenOperator?: BetweenOperatorConfig
}

// ── Built-in text operators ────────────────────────────────────────────────

export const TEXT_OPERATORS: FilterOperatorDef<string>[] = [
	{
		id: 'contains',
		label: 'Contains',
		symbol: '⊇',
		filterFn: (rowValue, filterValue) => {
			if (rowValue == null) return false
			return String(rowValue).toLowerCase().includes(filterValue.toLowerCase())
		},
	},
	{
		id: 'equals',
		label: 'Equals',
		symbol: '=',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '').toLowerCase() === filterValue.toLowerCase(),
	},
	{
		id: 'startsWith',
		label: 'Starts with',
		symbol: 'a…',
		filterFn: (rowValue, filterValue) =>
			String(rowValue ?? '')
				.toLowerCase()
				.startsWith(filterValue.toLowerCase()),
	},
	{
		id: 'endsWith',
		label: 'Ends with',
		symbol: '…a',
		filterFn: (rowValue, filterValue) =>
			String(rowValue ?? '')
				.toLowerCase()
				.endsWith(filterValue.toLowerCase()),
	},
	{
		id: 'isEmpty',
		label: 'Is empty',
		symbol: '∅',
		requiresInput: false,
		filterFn: (rowValue) => rowValue == null || rowValue === '',
	},
	{
		id: 'isNotEmpty',
		label: 'Is not empty',
		symbol: '≠∅',
		requiresInput: false,
		filterFn: (rowValue) => rowValue != null && rowValue !== '',
	},
]

// ── Built-in number operators ──────────────────────────────────────────────

export const NUMBER_OPERATORS: FilterOperatorDef<number>[] = [
	{
		id: 'eq',
		label: 'Equals',
		symbol: '=',
		filterFn: (rowValue, filterValue) => Number(rowValue) === filterValue,
	},
	{
		id: 'neq',
		label: 'Not equals',
		symbol: '≠',
		filterFn: (rowValue, filterValue) => Number(rowValue) !== filterValue,
	},
	{
		id: 'gt',
		label: 'Greater than',
		symbol: '>',
		filterFn: (rowValue, filterValue) => Number(rowValue) > filterValue,
	},
	{
		id: 'gte',
		label: 'Greater than or equal',
		symbol: '≥',
		filterFn: (rowValue, filterValue) => Number(rowValue) >= filterValue,
	},
	{
		id: 'lt',
		label: 'Less than',
		symbol: '<',
		filterFn: (rowValue, filterValue) => Number(rowValue) < filterValue,
	},
	{
		id: 'lte',
		label: 'Less than or equal',
		symbol: '≤',
		filterFn: (rowValue, filterValue) => Number(rowValue) <= filterValue,
	},
	{
		id: 'between',
		label: 'Between',
		symbol: '↔',
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
export type MultiSelectOption = {
	value: string
	label: string
	/** Optional faceted count — number of rows matching this value in current data. */
	count?: number
}

export const IN_OPERATORS: FilterOperatorDef<string[]>[] = [
	{
		id: 'in',
		label: 'Is any of',
		symbol: '∈',
		filterFn: (rowValue, filterValue) => {
			if (!Array.isArray(filterValue) || filterValue.length === 0) return true
			const v = rowValue == null ? '' : String(rowValue)
			return filterValue.includes(v)
		},
	},
	{
		id: 'notIn',
		label: 'Is none of',
		symbol: '∉',
		filterFn: (rowValue, filterValue) => {
			if (!Array.isArray(filterValue) || filterValue.length === 0) return true
			const v = rowValue == null ? '' : String(rowValue)
			return !filterValue.includes(v)
		},
	},
]

// ── Built-in date operators ────────────────────────────────────────────────

export const DATE_OPERATORS: FilterOperatorDef<string>[] = [
	{
		id: 'eq',
		label: 'Equals',
		symbol: '=',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') === filterValue,
	},
	{
		id: 'after',
		label: 'After',
		symbol: '>',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') > filterValue,
	},
	{
		id: 'onOrAfter',
		label: 'On or after',
		symbol: '≥',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') >= filterValue,
	},
	{
		id: 'before',
		label: 'Before',
		symbol: '<',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') < filterValue,
	},
	{
		id: 'onOrBefore',
		label: 'On or before',
		symbol: '≤',
		filterFn: (rowValue, filterValue) => String(rowValue ?? '') <= filterValue,
	},
	{
		id: 'between',
		label: 'Between',
		symbol: '↔',
		filterFn: (rowValue, filterValue) => {
			const val = String(rowValue ?? '')
			const fv = filterValue as unknown as BetweenValue<string>
			if (fv.from !== undefined && fv.from !== '' && val < fv.from) return false
			if (fv.to !== undefined && fv.to !== '' && val > fv.to) return false
			return true
		},
	},
]

// ── Lookup tables ─────────────────────────────────────────────────────────

const TEXT_EMPTY_OPERATORS = TEXT_OPERATORS.filter((op) => op.id === 'isEmpty' || op.id === 'isNotEmpty')

const SELECT_BADGE_OPERATORS: FilterOperatorDef[] = [
	...(IN_OPERATORS as FilterOperatorDef[]),
	...(TEXT_EMPTY_OPERATORS as FilterOperatorDef[]),
]

export const DEFAULT_OPERATORS_BY_TYPE: Record<string, FilterOperatorDef[]> = {
	text: TEXT_OPERATORS as FilterOperatorDef[],
	number: NUMBER_OPERATORS as FilterOperatorDef[],
	date: DATE_OPERATORS as FilterOperatorDef[],
	select: SELECT_BADGE_OPERATORS,
	badge: SELECT_BADGE_OPERATORS,
}

export const DEFAULT_OPERATOR_ID_BY_TYPE: Record<string, string> = {
	text: 'contains',
	number: 'eq',
	date: 'eq',
	select: 'in',
	badge: 'in',
}

// ── Registry ──────────────────────────────────────────────────────────────

export type OperatorRegistry = Map<string, FilterOperatorDef>

const ALL_BUILT_INS: FilterOperatorDef[] = [
	...(TEXT_OPERATORS as FilterOperatorDef[]),
	...(NUMBER_OPERATORS as FilterOperatorDef[]),
	...(DATE_OPERATORS as FilterOperatorDef[]),
	...(IN_OPERATORS as FilterOperatorDef[]),
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

/**
 * Resolves the final operator list for a column from its config.
 * Prefers cell-type-specific operators over the global registry for same-ID lookups
 * so number 'eq' uses number comparison and date 'eq' uses date comparison.
 */
export function resolveColumnOperators(
	operatorsConfig: true | ColumnOperatorsConfig,
	registry: OperatorRegistry,
	cellTypeOperators?: FilterOperatorDef[],
): FilterOperatorDef[] {
	if (operatorsConfig === true || !operatorsConfig.items) {
		return cellTypeOperators ?? []
	}

	const cellTypeById = cellTypeOperators ? new Map(cellTypeOperators.map((op) => [op.id, op])) : undefined

	return operatorsConfig.items.map((item): FilterOperatorDef => {
		if (typeof item === 'string') {
			return cellTypeById?.get(item) ?? registry.get(item) ?? { id: item, label: item, filterFn: () => true }
		}
		return item
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
