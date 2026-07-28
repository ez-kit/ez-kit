import type { Codec } from './codec'

/** Parser for `bigint` fields. Serializes to its decimal string; bad input throws (→ default). */
export function paramBigInt(): Codec<bigint> {
	return {
		stringify: (value) => String(value),
		parse: (raw) => {
			try {
				return BigInt(raw)
			} catch {
				throw new Error(`paramBigInt: "${raw}" is not a bigint`)
			}
		},
	}
}
