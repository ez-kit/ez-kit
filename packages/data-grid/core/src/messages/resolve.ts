import { defaultMessages } from './defaults'

import type { GridMessages, PartialGridMessages } from './types'

/** A nested record of a group — `filtering.presets` — as opposed to a string or a function entry. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

/**
 * Lays `over` on `below` entry by entry, skipping an entry written as `undefined` — a layer
 * assembled at runtime (a spread of an optional value) says "not set" that way, never "erase".
 */
function mergeEntries(below: object, over: object, nested: boolean): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...below }
	for (const [key, entry] of Object.entries(over) as [string, unknown][]) {
		if (entry === undefined) continue
		const under = merged[key]
		merged[key] = nested && isRecord(entry) && isRecord(under) ? mergeEntries(under, entry, false) : entry
	}
	return merged
}

/**
 * Lays one group of a layer over the resolved group, entry by entry, and one level further for
 * an entry that is itself a record. Function entries are leaves: an override replaces one whole.
 */
function mergeGroup(resolved: object, group: object): object {
	return mergeEntries(resolved, group, true)
}

/**
 * Folds partial dictionaries onto {@link defaultMessages}, later layers winning.
 *
 * Merged **per entry, not per dictionary or per group**: overriding `messages.pagination.rowsPerPage`
 * keeps the other pagination entries, and overriding `messages.filtering.presets.today` keeps the
 * other presets. A shallow `{ ...defaults, ...override }` would drop them, which is the failure mode
 * a consumer hits on their first override and cannot see until the button they never touched renders
 * empty. Two levels is the dictionary's whole depth — a group, then a record inside it — so the merge
 * stops there, and a function entry is never merged into: it is the consumer's own sentence.
 *
 * Layers are the grid's own option layers, in the order `useDataGrid` merges them — factory
 * defaults, then provider, then instance — so an app-wide locale is set once on the provider and
 * a single grid overrides one string of it.
 *
 * @example
 * resolveMessages({ pagination: { rowsPerPage: 'Строк на странице' } })
 */
export function resolveMessages(...layers: (PartialGridMessages | undefined)[]): GridMessages {
	return layers.reduce<GridMessages>((resolved, layer) => {
		if (!layer) return resolved
		// Built loosely and narrowed once at the end: iterating the keys widens each one to the
		// union of all of them, which would make every assignment target the *intersection* of
		// every group. One cast here beats a cast per group.
		const merged: Record<string, unknown> = { ...resolved }
		// `Object.entries` on the mapped type drops the `?`, so the value reads as always
		// present; a layer written as `{ pagination: undefined }` says otherwise at runtime.
		for (const [key, group] of Object.entries(layer) as [string, object | undefined][]) {
			if (!group) continue
			merged[key] = mergeGroup(resolved[key as keyof GridMessages], group)
		}
		return merged as GridMessages
	}, defaultMessages)
}
