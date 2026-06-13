import type { Param } from '../types'

/** Default separator between encoded array items. */
const DEFAULT_SEPARATOR = ','

/**
 * Percent-encode every character of `value` (e.g. `,` → `%2C`). Native
 * `encodeURIComponent` leaves some separator characters untouched, so we encode
 * the separator ourselves to guarantee it can never collide with item content.
 */
function percentEncode(value: string): string {
	return Array.from(value)
		.map((char) => '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
		.join('')
}

export type ParamArrayOptions = {
	/** Separator between encoded items. Defaults to `,`. */
	separator?: string
}

/**
 * Parser for arrays. Each item is encoded by `item`, URI-escaped to protect the
 * separator, then joined. An empty array is omitted (`null`).
 */
export function paramArray<T>(item: Param<T>, options: ParamArrayOptions = {}): Param<T[]> {
	const separator = options.separator ?? DEFAULT_SEPARATOR
	const sepEncoded = percentEncode(separator)
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
