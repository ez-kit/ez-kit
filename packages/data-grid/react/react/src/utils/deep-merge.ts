/**
 * React tags every element with a `$$typeof` field. Element trees are opaque values,
 * never option bags, so `deepMerge` must replace them wholesale instead of recursing.
 */
const REACT_ELEMENT_KEY = '$$typeof'

/**
 * A recursively-mergeable plain object: a `{}`-literal / `Object.create(null)` bag whose
 * fields carry configuration. Excludes arrays, `null`, class instances (e.g. `Date`), and
 * React elements — those are treated as atomic values and replaced, not merged.
 */
function isMergeableObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
	const proto = Object.getPrototypeOf(value) as object | null
	if (proto !== Object.prototype && proto !== null) return false
	return !(REACT_ELEMENT_KEY in value)
}

/**
 * Immutable recursive merge. `source` (higher priority) is layered over `target`:
 * - both values are mergeable plain objects → merged recursively;
 * - `source` value is `undefined` → the `target` value is kept (never introduces `key: undefined`);
 * - otherwise → the `source` value wins (arrays and atomic values replace).
 *
 * Neither argument is mutated — a fresh object graph is returned for every merged branch.
 */
export function deepMerge(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...target }
	for (const key of Object.keys(source)) {
		const sourceValue = source[key]
		if (sourceValue === undefined) continue
		const targetValue = result[key]
		result[key] =
			isMergeableObject(targetValue) && isMergeableObject(sourceValue)
				? deepMerge(targetValue, sourceValue)
				: sourceValue
	}
	return result
}
