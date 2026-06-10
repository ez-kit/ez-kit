import type { ParamCodec } from '../types'
import type { ZodType } from 'zod'


/**
 * Codec backed by a Zod schema: `parse` validates on read, so a malformed deep-link throws
 * and the engine falls back to the field default. Strings pass through; other values are JSON.
 */
export function zodParam<T>(schema: ZodType<T>): ParamCodec<T> {
	return {
		serialize: (value) => (typeof value === 'string' ? value : JSON.stringify(value)),
		deserialize: (raw) => {
			let candidate: unknown = raw
			try {
				candidate = JSON.parse(raw)
			} catch {
				candidate = raw
			}
			return schema.parse(candidate)
		},
		equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
	}
}
