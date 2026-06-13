import { canonicalStringify } from '../layouts/nested'

import type { Param } from '../types'
import type { ZodType } from 'zod'

/**
 * Parser backed by a Zod schema: `parse` validates on read, so a malformed deep-link throws
 * and the engine falls back to the field default. Strings pass through; other values are JSON.
 */
export function zodParam<T>(schema: ZodType<T>): Param<T> {
	return {
		stringify: (value) => (typeof value === 'string' ? value : JSON.stringify(value)),
		parse: (raw) => {
			let candidate: unknown = raw
			try {
				candidate = JSON.parse(raw)
			} catch {
				candidate = raw
			}
			return schema.parse(candidate)
		},
		equals: (a, b) => canonicalStringify(a) === canonicalStringify(b),
	}
}
