import type { Param } from '../types'

/** Parser for arbitrary JSON-serializable leaf values. Use sparingly — keep URLs small. */
export function paramJson<T>(): Param<T> {
	return {
		stringify: (value) => JSON.stringify(value),
		parse: (raw) => JSON.parse(raw) as T,
		equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
	}
}
