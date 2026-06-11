import type { Param } from '../types'

/** Parser for `bigint` fields. Serializes to its decimal string; bad input throws (→ default). */
export function paramBigInt(): Param<bigint> {
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
