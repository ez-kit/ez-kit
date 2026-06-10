import type { ParamCodec } from '../types'

export type ParamArrayOptions = {
	/** Separator between encoded items. Defaults to `,`. */
	separator?: string
}

/**
 * Codec for arrays. Each item is encoded by `item`, URI-escaped to protect the
 * separator, then joined. An empty array is omitted (`null`).
 */
export function paramArray<T>(item: ParamCodec<T>, options: ParamArrayOptions = {}): ParamCodec<T[]> {
	const separator = options.separator ?? ','

	return {
		serialize: (value) => {
			if (value.length === 0) {
				return null
			}
			const parts: string[] = []
			for (const entry of value) {
				const encoded = item.serialize(entry)
				if (encoded !== null) {
					parts.push(encodeURIComponent(encoded))
				}
			}
			return parts.length === 0 ? null : parts.join(separator)
		},
		deserialize: (raw) => {
			if (raw === '') {
				return []
			}
			return raw.split(separator).map((part) => item.deserialize(decodeURIComponent(part)))
		},
		equals: (a, b) => a.length === b.length && a.every((value, index) => Object.is(value, b[index])),
	}
}
