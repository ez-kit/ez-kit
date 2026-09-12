import { PACKAGE_TAG } from '../package-tag'

import type { Codec } from './codec'

/** Parser for `Date` fields. Serializes to an ISO string; invalid input throws (→ default). */
export function paramDate(): Codec<Date> {
	return {
		stringify: (value) => {
			const time = value.getTime()
			return Number.isNaN(time) ? null : value.toISOString()
		},
		parse: (raw) => {
			const date = new Date(raw)
			if (Number.isNaN(date.getTime())) {
				throw new Error(`${PACKAGE_TAG} paramDate: "${raw}" is not a valid date`)
			}
			return date
		},
		equals: (a, b) => a.getTime() === b.getTime(),
	}
}
