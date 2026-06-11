import type { Param } from '../types'

export type ParamArrayOptions = {
	/** Separator between encoded items. Defaults to `,`. */
	separator?: string
}

/**
 * Parser for arrays. Each item is encoded by `item`, URI-escaped to protect the
 * separator, then joined. An empty array is omitted (`null`).
 */
export function paramArray<T>(item: Param<T>, options: ParamArrayOptions = {}): Param<T[]> {
	const separator = options.separator ?? ','

	return {
		stringify: (value) => {
			if (value.length === 0) {
				return null
			}
			const parts: string[] = []
			for (const entry of value) {
				const encoded = item.stringify(entry)
				if (encoded !== null) {
					parts.push(encodeURIComponent(encoded))
				}
			}
			return parts.length === 0 ? null : parts.join(separator)
		},
		parse: (raw) => {
			if (raw === '') {
				return []
			}
			return raw.split(separator).map((part) => item.parse(decodeURIComponent(part)))
		},
		equals: (a, b) => a.length === b.length && a.every((value, index) => Object.is(value, b[index])),
	}
}
