/**
 * Original option inputs, before normalizers allocate callbacks and nested bags. A stable
 * token publishes meaningful option replacement without publishing table.grid's per-render
 * identity. This is notification metadata, not another store or a copy of the live options.
 */
const inputs = new WeakMap<object, Record<string, unknown>>()

// These already have their own publication channel, or only seed construction.
const SEPARATE_CHANNELS = new Set(['state', 'context', 'initialState', 'onStateChange', 'onChange'])

// Payloads are opaque. In particular, never walk the dataset, column definitions, a renderer's
// arbitrary config, or server totals to decide whether to render. Replace them immutably.
const OPAQUE_INPUTS = new Set(['data', 'columns', 'features', 'operators', 'cellTypes', 'totals', 'config'])

function isOptionBag(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value) || '$$typeof' in value) return false
	const prototype: unknown = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/**
 * Compare config wrappers, not arbitrary user graphs. Arrays, functions, React elements and
 * non-plain objects retain identity semantics. The depth limit conservatively notifies for a
 * new deeper object and also bounds cyclic inputs; it can cause an extra render, never miss one.
 * Only state change handlers are excluded: they are delegated through the latest config by
 * useDataGrid. Other functions may render content or decide capabilities and must notify.
 */
function sameOptions(a: Record<string, unknown>, b: Record<string, unknown>, depth = 0): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	for (const key of keys) {
		if ((depth === 0 && SEPARATE_CHANNELS.has(key)) || (depth === 1 && key === 'onChange')) continue
		const previous = a[key]
		const next = b[key]
		if (Object.is(previous, next)) continue
		if (OPAQUE_INPUTS.has(key) || depth >= 4 || !isOptionBag(previous) || !isOptionBag(next)) return false
		if (!sameOptions(previous, next, depth + 1)) return false
	}
	return true
}

export function publishTableOptionInputs(table: object, config: Record<string, unknown>): void {
	const previous = inputs.get(table)
	if (previous === undefined || !sameOptions(previous, config)) inputs.set(table, config)
}

export function tableOptionInputs(table: object): object | undefined {
	return inputs.get(table)
}
