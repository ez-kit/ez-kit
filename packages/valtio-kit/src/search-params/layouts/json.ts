import type { PersistedValues, SearchParamsLayout } from '../types'

/** Stable-key-order JSON so the engine's equality guard is reliable. */
function canonicalStringify(values: PersistedValues): string {
	const sortedKeys = Object.keys(values).sort()
	const ordered: PersistedValues = {}
	for (const key of sortedKeys) {
		ordered[key] = values[key]
	}
	return JSON.stringify(ordered)
}

/**
 * Bundles all persisted fields into one JSON-encoded key (`?filters={"q":"a","sort":"asc"}`).
 * Compact and collision-free across multiple stores; trades single-param interop.
 */
export function json(key: string): SearchParamsLayout {
	return {
		ownedKeys: () => [key],

		read: (params, fields) => {
			if (!params.has(key)) {
				return {}
			}
			let parsed: unknown
			try {
				parsed = JSON.parse(params.get(key) ?? '')
			} catch {
				return {}
			}
			if (parsed === null || typeof parsed !== 'object') {
				return {}
			}
			const source = parsed as Record<string, unknown>
			const values: PersistedValues = {}
			for (const name of Object.keys(fields)) {
				if (fields[name] && name in source) {
					values[name] = source[name]
				}
			}
			return values
		},

		write: (params, values) => {
			const next = new URLSearchParams(params)
			if (Object.keys(values).length === 0) {
				next.delete(key)
			} else {
				next.set(key, canonicalStringify(values))
			}
			return next
		},
	}
}
