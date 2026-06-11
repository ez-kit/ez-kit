import type { FieldDescriptor, FieldValues, SearchParamsLayout } from '../types'

export type FlatLayoutOptions = {
	/** Prefix applied to every owned param key (e.g. `'cart.'` → `cart.filters.q`). */
	prefix?: string
}

/** The URL key for a field: joined path by default, `key` renames the leaf, `absolute` drops the prefix. */
export function flatKey(field: FieldDescriptor, prefix: string): string {
	const leaf = field.key ?? field.path.at(-1) ?? ''
	const base = field.absolute ? leaf : [...field.path.slice(0, -1), leaf].join('.')
	return `${prefix}${base}`
}

/**
 * Maps each persisted field to its own URL key (`?q=5&filters.sort=asc`). The mode that lets
 * arbitrary components read individual params via the router's `useSearchParams`.
 */
export function flat(options: FlatLayoutOptions = {}): SearchParamsLayout {
	const prefix = options.prefix ?? ''

	return {
		ownedKeys: (fields) => fields.map((field) => flatKey(field, prefix)),

		read: (params, fields) => {
			const values: FieldValues = new Map()
			for (const field of fields) {
				const key = flatKey(field, prefix)
				if (!params.has(key)) {
					continue
				}
				try {
					values.set(field, field.parser.parse(params.get(key) ?? ''))
				} catch {
					// Invalid value — leave absent so the field keeps its default.
				}
			}
			return values
		},

		write: (params, values, fields) => {
			const next = new URLSearchParams(params)
			for (const field of fields) {
				const key = flatKey(field, prefix)
				if (!values.has(field)) {
					next.delete(key)
					continue
				}
				const encoded = field.parser.stringify(values.get(field))
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
