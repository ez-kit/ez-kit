import type { Param } from '../types'

/** Parser for finite number fields. Non-finite values are omitted; bad input throws (→ default). */
export function paramNumber(): Param<number> {
	return {
		stringify: (value) => (Number.isFinite(value) ? String(value) : null),
		parse: (raw) => {
			if (raw.trim() === '') {
				throw new Error(`paramNumber: empty value`)
			}
			const parsed = Number(raw)
			if (Number.isNaN(parsed)) {
				throw new Error(`paramNumber: "${raw}" is not a number`)
			}
			return parsed
		},
	}
}
