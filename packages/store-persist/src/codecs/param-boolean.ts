import type { Codec } from './codec'

/** Canonical serialized form for `true`/`false`. */
const TRUE = 'true'
const FALSE = 'false'
/** Numeric aliases accepted on parse for ergonomics. */
const TRUE_ALIAS = '1'
const FALSE_ALIAS = '0'

/** Parser for boolean fields. Serializes to `true`/`false`; also reads `1`/`0`. */
export function paramBoolean(): Codec<boolean> {
	return {
		stringify: (value) => (value ? TRUE : FALSE),
		parse: (raw) => {
			if (raw === TRUE || raw === TRUE_ALIAS) {
				return true
			}
			if (raw === FALSE || raw === FALSE_ALIAS) {
				return false
			}
			throw new Error(`paramBoolean: "${raw}" is not a boolean`)
		},
	}
}
