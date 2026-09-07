import { canonicalStringify } from './canonical'

import type { Codec } from './codec'

/** Parser for arbitrary JSON-serializable leaf values. Use sparingly — keep URLs small. */
export function paramJson<T>(): Codec<T> {
	return {
		stringify: (value) => JSON.stringify(value),
		parse: (raw) => JSON.parse(raw) as T,
		equals: (a, b) => canonicalStringify(a) === canonicalStringify(b),
	}
}
