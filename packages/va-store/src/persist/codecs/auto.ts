import { paramArray } from './param-array'
import { paramBigInt } from './param-bigint'
import { paramBoolean } from './param-boolean'
import { paramDate } from './param-date'
import { paramNumber } from './param-number'
import { paramString } from './param-string'

import type { AnyCodec } from './codec'

/** Human-readable brands for runtime values that have no `typeof` of their own. */
enum ValueBrand {
	Null = 'null',
	Array = 'array',
	Object = 'object',
}

/** Maps a primitive `typeof` tag to the parser factory that handles it. */
const PRIMITIVE_PARSERS: Partial<Record<string, () => AnyCodec>> = {
	string: paramString,
	number: paramNumber,
	boolean: paramBoolean,
	bigint: paramBigInt,
}

function describe(value: unknown): string {
	if (value === null) {
		return ValueBrand.Null
	}
	if (Array.isArray(value)) {
		return ValueBrand.Array
	}
	if (typeof value === 'object') {
		const named = value as { constructor?: { name?: string } }
		return named.constructor?.name ?? ValueBrand.Object
	}
	return typeof value
}

function unresolvable(pathLabel: string, value: unknown): never {
	throw new Error(
		`[va-store] persist: cannot auto-resolve a parser for "${pathLabel}" (value: ${describe(value)}). ` +
			`Pass an explicit parser, e.g. @persistUrl({ parser: paramJson() }) or field(s => …, { parser: paramJson() }).`,
	)
}

/**
 * Pick a built-in parser from the runtime value brand. Primitives, `Date`, and arrays
 * (item brand inferred from the first element) resolve automatically; anything else
 * (`null`/`undefined`/plain object/`Set`/`Map`/class instance) fails fast.
 */
export function resolveParser(value: unknown, pathLabel: string): AnyCodec {
	const primitive = PRIMITIVE_PARSERS[typeof value]
	if (primitive) {
		return primitive()
	}
	if (value instanceof Date) {
		return paramDate()
	}
	if (Array.isArray(value)) {
		const first: unknown = value[0]
		if (first === undefined) {
			throw new Error(
				`[va-store] search-params: cannot infer an item parser for the empty array "${pathLabel}". ` +
					`Pass an explicit parser, e.g. field(s => …, { parser: paramArray(paramString()) }).`,
			)
		}
		return paramArray(resolveParser(first, pathLabel))
	}
	return unresolvable(pathLabel, value)
}
