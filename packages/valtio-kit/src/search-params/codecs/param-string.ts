import type { Param } from '../types'

/** Parser for plain string fields. Identity in both directions. */
export function paramString(): Param<string> {
	return {
		stringify: (value) => value,
		parse: (raw) => raw,
	}
}
