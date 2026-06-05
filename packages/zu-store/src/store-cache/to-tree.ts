import type { CacheRecord, CacheTree } from './types'

/**
 * Build the nested object view from a flat coordinate list. Pure: returns a fresh tree each call.
 * Uses local mutation on freshly-allocated accumulator objects — no external side effects.
 */
export function toTree(records: readonly CacheRecord[]): CacheTree {
	const root: CacheTree = {}
	for (const { path, name, id } of records) {
		let node = root
		for (const segment of path) {
			const existing = node[segment]
			if (existing !== undefined && !Array.isArray(existing)) {
				node = existing
			} else {
				const created: CacheTree = {}
				node[segment] = created
				node = created
			}
		}
		const leaf = node[name]
		if (Array.isArray(leaf)) {
			leaf.push(id)
		} else {
			node[name] = [id]
		}
	}
	return root
}
