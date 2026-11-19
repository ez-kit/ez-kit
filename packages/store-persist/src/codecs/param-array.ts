import { PACKAGE_TAG } from '../package-tag'

import type { Codec } from './codec'

/** Default separator between encoded array items. */
const DEFAULT_SEPARATOR = ','

/**
 * Percent-encode every character of `value` (e.g. `,` → `%2C`). Native
 * `encodeURIComponent` leaves some separator characters untouched, so we encode
 * the separator ourselves to guarantee it can never collide with item content.
 */
function percentEncode(value: string): string {
	return Array.from(value)
		.map((char) => {
			const encoded = encodeURIComponent(char)
			return encoded === char ? '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0') : encoded
		})
		.join('')
}

export type ParamArrayOptions = {
	/** Separator between encoded items. Defaults to `,`. */
	separator?: string
}

/**
 * Parser for arrays. Each item is encoded by `item`, URI-escaped to protect the
 * separator, then joined. Ambiguous items/separators use a framed representation;
 * unambiguous legacy values keep their encoding. An empty array is omitted (`null`).
 */
export function paramArray<T>(item: Codec<T>, options: ParamArrayOptions = {}): Codec<T[]> {
	const separator = options.separator ?? DEFAULT_SEPARATOR
	// URI-escaped items cannot start with either raw bracket. A different first character from
	// the separator therefore cannot begin a legacy writer's output, even with leading empty items.
	const framePrefix = `${separator.startsWith('[') ? '{' : '['}%ez-kit.array:1:`
	const legacyItems = (raw: string): string[] => raw.split(separator).map((part) => decodeURIComponent(part))
	const parseItems = (raw: string): string[] => {
		if (!raw.startsWith(framePrefix)) return raw === '' ? [] : legacyItems(raw)
		const values: unknown = JSON.parse(raw.slice(framePrefix.length))
		if (!Array.isArray(values) || !values.every((value: unknown): value is string => typeof value === 'string'))
			throw new Error(`${PACKAGE_TAG} paramArray: invalid framed items`)
		return values
	}

	return {
		stringify: (value) => {
			if (value.length === 0) {
				return null
			}
			const parts: string[] = []
			for (const entry of value) {
				const encoded = item.stringify(entry)
				if (encoded !== null) {
					parts.push(encoded)
				}
			}
			if (parts.length === 0) return null
			try {
				const sepEncoded = percentEncode(separator)
				const raw = parts.map((part) => encodeURIComponent(part).replaceAll(separator, sepEncoded)).join(separator)
				const decoded = legacyItems(raw)
				if (raw !== '' && decoded.length === parts.length && decoded.every((part, index) => part === parts[index]))
					return raw
			} catch {
				// A delimiter can split URI escape sequences; framing also represents lone surrogates.
			}
			return framePrefix + JSON.stringify(parts)
		},
		parse: (raw) => parseItems(raw).map((part) => item.parse(part)),
		equals: (a, b) =>
			a.length === b.length &&
			a.every((value, index) => {
				const other = b[index] as T
				return item.equals
					? item.equals(value, other)
					: Object.is(value, other) || item.stringify(value) === item.stringify(other)
			}),
	}
}
