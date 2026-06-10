import type { PersistedValues, SearchParamsLayout } from '../types'

export type FlatLayoutOptions = {
	/** Prefix applied to every owned param key (e.g. `'cart.'` → `cart.id`). */
	prefix?: string
}

/**
 * Maps each persisted field to its own URL key (`?id=5&sort=asc`). The mode that lets
 * arbitrary components read individual params via the router's `useSearchParams`.
 */
export function flat(options: FlatLayoutOptions = {}): SearchParamsLayout {
	const prefix = options.prefix ?? ''
	const keyFor = (name: string): string => `${prefix}${name}`

	return {
		ownedKeys: (fieldNames) => fieldNames.map(keyFor),

		read: (params, fields) => {
			const values: PersistedValues = {}
			for (const name of Object.keys(fields)) {
				const codec = fields[name]
				const key = keyFor(name)
				if (!codec || !params.has(key)) {
					continue
				}
				const raw = params.get(key) ?? ''
				try {
					values[name] = codec.deserialize(raw)
				} catch {
					// Invalid value — leave absent so the field keeps its default.
				}
			}
			return values
		},

		write: (params, values, fields) => {
			const next = new URLSearchParams(params)
			for (const name of Object.keys(fields)) {
				const codec = fields[name]
				if (!codec) {
					continue
				}
				const key = keyFor(name)
				if (!(name in values)) {
					next.delete(key)
					continue
				}
				const encoded = codec.serialize(values[name])
				if (encoded === null) {
					next.delete(key)
				} else {
					next.set(key, encoded)
				}
			}
			return next
		},
	}
}
