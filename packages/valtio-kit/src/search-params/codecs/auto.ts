import { paramArray } from './param-array'
import { paramBigInt } from './param-bigint'
import { paramBoolean } from './param-boolean'
import { paramDate } from './param-date'
import { paramNumber } from './param-number'
import { paramString } from './param-string'

import type { AnyParam } from '../types'

function describe(value: unknown): string {
	if (value === null) {
		return 'null'
	}
	if (Array.isArray(value)) {
		return 'array'
	}
	if (typeof value === 'object') {
		const named = value as { constructor?: { name?: string } }
		return named.constructor?.name ?? 'object'
	}
	return typeof value
}

function unresolvable(pathLabel: string, value: unknown): never {
	throw new Error(
		`[valtio-kit] search-params: cannot auto-resolve a parser for "${pathLabel}" (value: ${describe(value)}). ` +
			`Pass an explicit parser, e.g. @searchParam({ parser: paramJson() }) or field(s => …, paramJson()).`,
	)
}

/**
 * Pick a built-in parser from the runtime value brand. Primitives, `Date`, and arrays
 * (item brand inferred from the first element) resolve automatically; anything else
 * (`null`/`undefined`/plain object/`Set`/`Map`/class instance) fails fast.
 */
export function resolveParser(value: unknown, pathLabel: string): AnyParam {
	switch (typeof value) {
		case 'string':
			return paramString()
		case 'number':
			return paramNumber()
		case 'boolean':
			return paramBoolean()
		case 'bigint':
			return paramBigInt()
		default:
			break
	}
	if (value instanceof Date) {
		return paramDate()
	}
	if (Array.isArray(value)) {
		const first: unknown = value[0]
		if (first === undefined) {
			throw new Error(
				`[valtio-kit] search-params: cannot infer an item parser for the empty array "${pathLabel}". ` +
					`Pass an explicit parser, e.g. field(s => …, paramArray(paramString())).`,
			)
		}
		return paramArray(resolveParser(first, pathLabel))
	}
	return unresolvable(pathLabel, value)
}
