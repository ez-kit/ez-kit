import type { Codec } from './codec'

/** Parser for plain string fields. Identity in both directions. */
export function paramString(): Codec<string> {
	return {
		stringify: (value) => value,
		parse: (raw) => raw,
	}
}
