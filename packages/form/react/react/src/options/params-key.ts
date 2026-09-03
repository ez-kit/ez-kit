/**
 * A by-value identity for an option source's parameter object.
 *
 * Everything that watches the parameters — the memo that keeps the object handed to a source
 * referentially stable, and the effect that clears the dependent field when they change —
 * compares **by value, never by reference**. An inline `optionsParams={{ country }}` literal
 * is a brand-new object on every render and must not, by itself, mean anything changed.
 *
 * Keys are sorted at every depth, so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are the same
 * parameters — a document and a hand-written call site have no reason to agree on key order.
 * A value the source's own parameters could not sensibly carry (a function, a `Symbol`) is
 * named by its `typeof` rather than silently dropped the way `JSON.stringify` would.
 */
export function paramsKey(params: Record<string, unknown> | undefined): string {
	return stableStringify(params ?? {})
}

function stableStringify(value: unknown): string {
	if (value === undefined) return 'undefined'
	if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
		return JSON.stringify(value)
	}
	if (Array.isArray(value)) {
		return `[${(value as unknown[]).map(stableStringify).join(',')}]`
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
		return `{${entries.join(',')}}`
	}
	return `[${typeof value}]`
}
