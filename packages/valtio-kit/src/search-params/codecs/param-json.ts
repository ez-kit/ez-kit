import type { ParamCodec } from '../types'

/** Codec for arbitrary JSON-serializable values. Use sparingly — keep URLs small. */
export function paramJson<T>(): ParamCodec<T> {
	return {
		serialize: (value) => JSON.stringify(value),
		deserialize: (raw) => JSON.parse(raw) as T,
		equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
	}
}
