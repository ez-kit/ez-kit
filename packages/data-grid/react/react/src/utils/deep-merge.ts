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
 * - `source` value is `true` over a config object → **the object is kept** (see below);
 * - otherwise → the `source` value wins (arrays and atomic values replace).
 *
 * Neither argument is mutated — a fresh object graph is returned for every merged branch.
 *
 * ## Why `true` does not replace a config object
 *
 * Every grid feature is typed `boolean | SomeConfig`, where `true` means "on, with defaults"
 * and an object means "on, configured like this". Both spellings say *enabled*; the object
 * merely says more. So a call site writing the shorter one over a defaults layer that wrote
 * the longer one — `<DataGridOptionsProvider defaults={{ pagination: { pageSize: 50 } }}>`
 * plus `pagination: true` at the call site — is asking to enable pagination, not to throw the
 * page size away. Replacing wholesale would silently drop it, and `true` is the most natural
 * way to write "yes, this one too", so the trap would be sprung constantly.
 *
 * `false` still replaces: that reverses the decision rather than restating it, and a call site
 * must always be able to turn a defaulted feature off.
 */
export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = { ...target }
	for (const key of Object.keys(source)) {
		const sourceValue = source[key]
		if (sourceValue === undefined) continue
		const targetValue = result[key]
		if (isMergeableObject(targetValue) && isMergeableObject(sourceValue)) {
			result[key] = deepMerge(targetValue, sourceValue)
			continue
		}
		// `true` over an existing config object is a redundant "enabled" — keep the config.
		if (sourceValue === true && isMergeableObject(targetValue)) continue
		result[key] = sourceValue
	}
	return result
}
