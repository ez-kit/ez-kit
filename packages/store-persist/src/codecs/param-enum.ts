import { PACKAGE_TAG } from '../package-tag'

import type { Codec } from './codec'

/** Parser for a string-literal union constrained to `values`. Unknown input throws (→ default). */
export function paramEnum<T extends string>(values: readonly T[]): Codec<T> {
	const allowed = new Set<string>(values)
	return {
		stringify: (value) => value,
		parse: (raw) => {
			if (!allowed.has(raw)) {
				throw new Error(`${PACKAGE_TAG} paramEnum: "${raw}" is not one of ${values.join(', ')}`)
			}
			return raw as T
		},
	}
}
