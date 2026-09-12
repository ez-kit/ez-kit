import { defaultMessages } from './defaults'

import type { GridMessages, PartialGridMessages } from './types'

/**
 * Folds partial dictionaries onto {@link defaultMessages}, later layers winning.
 *
 * Merged **per group, not per dictionary**: overriding `messages.pagination.rowsPerPage` keeps
 * the other six pagination entries. A shallow `{ ...defaults, ...override }` would drop them,
 * which is the failure mode a consumer hits on their first override and cannot see until the
 * button they never touched renders empty.
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
			merged[key] = { ...resolved[key as keyof GridMessages], ...group }
		}
		return merged as GridMessages
	}, defaultMessages)
}
