/**
 * A registered filter function as the `filterFns` slot holds it: callable, with the optional hook
 * the filtered row model calls once per filter before any row is tested.
 */
type RegisteredFilterFn = ((...args: never[]) => unknown) & { resolveFilterValue?: (value: unknown) => unknown }

type FilterFnRegistry = Record<string, RegisteredFilterFn | undefined>

/**
 * The registry entries written for a `[min, max]` tuple whose `resolveFilterValue` destructures it.
 *
 * They are the ones `'auto'` picks for a column holding numbers or `Date`s, and `'auto'` is what
 * every column without operators carries — so they are reached by a filter nobody named.
 */
const RANGE_FILTER_FNS = ['inNumberRange', 'inDateRange'] as const

const wrappedFns = new WeakMap<RegisteredFilterFn, RegisteredFilterFn>()
const wrappedSets = new WeakMap<object, object>()

/** `value` as the tuple a range filter reads: itself when it is one, `[value, value]` otherwise. */
function asRange(value: unknown): unknown {
	return Array.isArray(value) ? value : [value, value]
}

/**
 * `fn` with a `resolveFilterValue` that also accepts one value, read as the range `[value, value]`.
 *
 * The plain filter control of a number or a date column hands back one value, never a tuple — a
 * `NumberInput`, a date picker, a text input on a column with no cell type. TanStack's own range
 * functions destructure it and throw `val is not iterable` from inside the filtered row model, so
 * the grid stopped rendering rows the moment someone typed. A degenerate range is the reading that
 * needs no new comparison: each end goes through the parsing the range form already does, so a
 * numeric string still matches its number, a non-numeric one opens the range and keeps every row,
 * and a date matches the instant it names.
 */
function acceptScalar(fn: RegisteredFilterFn): RegisteredFilterFn {
	const cached = wrappedFns.get(fn)
	if (cached !== undefined) return cached

	const resolve = fn.resolveFilterValue
	const wrapped = Object.assign((...args: never[]) => fn(...args), fn, {
		resolveFilterValue: (value: unknown) => (resolve ? resolve(asRange(value)) : asRange(value)),
	})
	wrappedFns.set(fn, wrapped)
	return wrapped
}

/**
 * The consumer's feature set with the range entries of its `filterFns` made to accept one value,
 * or the set itself when it registers no `filterFns`.
 *
 * A registry entry rather than a column's `filterFn`, on purpose. Replacing `'auto'` with a function
 * on every plain column would mean re-deriving upstream's auto rule, which is not exported, and it
 * would stop the `filterFns` guard in `createTableOptions` from seeing those columns, which do still
 * resolve every other name through the registry. Wrapping the two entries changes nothing but the
 * one input that used to throw. It also covers a column that names `'inNumberRange'` itself.
 *
 * Cached per consumer set, like `withGatedFilteredRowModel`, so a set handed in on every render
 * yields one object for the table.
 */
export function withScalarRangeFilters<TFeatures extends object>(features: TFeatures): TFeatures {
	const registry = (features as { filterFns?: FilterFnRegistry }).filterFns
	if (registry === undefined) return features

	const cached = wrappedSets.get(features)
	if (cached !== undefined) return cached as TFeatures

	const patched: FilterFnRegistry = { ...registry }
	for (const name of RANGE_FILTER_FNS) {
		const fn = registry[name]
		if (fn !== undefined) patched[name] = acceptScalar(fn)
	}
	const wrapped = { ...features, filterFns: patched }
	wrappedSets.set(features, wrapped)
	return wrapped
}
