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
	// Always build the percent-encoded form unconditionally — encodeURIComponent leaves some
	// characters (e.g. ",") unencoded, which would corrupt items that contain the separator.
	const sepEncoded = Array.from(separator)
		.map((c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
		.join('')
	const escapeItem = (s: string): string => encodeURIComponent(s).replaceAll(separator, sepEncoded)

	return {
		stringify: (value) => {
			if (value.length === 0) {
				return null
			}
			const parts: string[] = []
			for (const entry of value) {
				const encoded = item.stringify(entry)
				if (encoded !== null) {
					parts.push(escapeItem(encoded))
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
