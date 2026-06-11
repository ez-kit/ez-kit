import type { Param } from '../types'

/** Parser for boolean fields. Serializes to `true`/`false`; also reads `1`/`0`. */
export function paramBoolean(): Param<boolean> {
	return {
		stringify: (value) => (value ? 'true' : 'false'),
		parse: (raw) => {
			if (raw === 'true' || raw === '1') {
				return true
			}
			if (raw === 'false' || raw === '0') {
				return false
			}
			throw new Error(`paramBoolean: "${raw}" is not a boolean`)
		},
	}
}
