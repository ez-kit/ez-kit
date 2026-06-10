import type { ParamCodec } from '../types'

/** Codec for a string-literal union constrained to `values`. Unknown input throws (→ default). */
export function paramEnum<T extends string>(values: readonly T[]): ParamCodec<T> {
	const allowed = new Set<string>(values)
	return {
		serialize: (value) => value,
		deserialize: (raw) => {
			if (!allowed.has(raw)) {
				throw new Error(`paramEnum: "${raw}" is not one of ${values.join(', ')}`)
			}
			return raw as T
		},
	}
}
