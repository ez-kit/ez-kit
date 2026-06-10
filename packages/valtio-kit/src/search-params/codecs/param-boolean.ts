import type { ParamCodec } from '../types'

/** Codec for boolean fields. Serializes to `true`/`false`; also reads `1`/`0`. */
export function paramBoolean(): ParamCodec<boolean> {
	return {
		serialize: (value) => (value ? 'true' : 'false'),
		deserialize: (raw) => {
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
