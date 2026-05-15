/**
 * Shallow equality check used as the default `isEqual` for {@link useDataGridSelector}.
 *
 * Returns `true` when `a` and `b` are:
 * - Object.is-equal (primitives, same reference)
 * - Arrays of the same length whose elements are Object.is-equal
 * - Plain objects with the same own keys whose values are Object.is-equal
 * - Maps of the same size whose entries are Object.is-equal
 * - Sets of the same size containing the same elements
 *
 * Otherwise returns `false`. Does not recurse.
 */
export function shallow<T>(a: T, b: T): boolean {
	if (Object.is(a, b)) return true
	if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false

	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false
		for (let i = 0; i < a.length; i++) {
			if (!Object.is(a[i], b[i])) return false
		}
		return true
	}
	if (Array.isArray(b)) return false

	if (a instanceof Map) {
		if (!(b instanceof Map) || a.size !== b.size) return false
		for (const [key, value] of a) {
			if (!b.has(key) || !Object.is(b.get(key), value)) return false
		}
		return true
	}
	if (b instanceof Map) return false

	if (a instanceof Set) {
		if (!(b instanceof Set) || a.size !== b.size) return false
		for (const value of a) {
			if (!b.has(value)) return false
		}
		return true
	}
	if (b instanceof Set) return false

	const aRecord = a as Record<string, unknown>
	const bRecord = b as Record<string, unknown>
	const aKeys = Object.keys(aRecord)
	if (aKeys.length !== Object.keys(bRecord).length) return false
	for (const key of aKeys) {
		if (!Object.prototype.hasOwnProperty.call(bRecord, key) || !Object.is(aRecord[key], bRecord[key])) {
			return false
		}
	}
	return true
}
