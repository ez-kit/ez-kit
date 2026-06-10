import type { ParamCodec } from '../types'

/** Codec for plain string fields. Identity in both directions. */
export function paramString(): ParamCodec<string> {
	return {
		serialize: (value) => value,
		deserialize: (raw) => raw,
	}
}
