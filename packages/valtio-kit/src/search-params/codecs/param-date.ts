import type { Param } from '../types'

/** Parser for `Date` fields. Serializes to an ISO string; invalid input throws (→ default). */
export function paramDate(): Param<Date> {
	return {
		stringify: (value) => {
			const time = value.getTime()
			return Number.isNaN(time) ? null : value.toISOString()
		},
		parse: (raw) => {
			const date = new Date(raw)
			if (Number.isNaN(date.getTime())) {
				throw new Error(`paramDate: "${raw}" is not a valid date`)
			}
			return date
		},
		equals: (a, b) => a.getTime() === b.getTime(),
	}
}
