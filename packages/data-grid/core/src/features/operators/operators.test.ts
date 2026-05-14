import { describe, expect, it } from 'vitest'

import {
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	IN_OPERATORS,
	buildOperatorRegistry,
	createOperatorFilterFn,
	resolveColumnOperators,
} from './operators'

import type { FilterOperatorDef } from './operators'

describe('IN_OPERATORS', () => {
	it('"in" matches when row value is included in the filter array', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'in')
		if (!op) throw new Error('expected `in` operator')
		expect(op.filterFn('a', ['a', 'b'])).toBe(true)
		expect(op.filterFn('c', ['a', 'b'])).toBe(false)
	})

	it('"in" coerces non-string row values via String()', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'in')
		if (!op) throw new Error('expected `in` operator')
		expect(op.filterFn(1, ['1', '2'])).toBe(true)
		expect(op.filterFn(true, ['true'])).toBe(true)
	})

	it('"in" treats null/undefined row values as empty string (no match)', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'in')
		if (!op) throw new Error('expected `in` operator')
		expect(op.filterFn(null, ['a'])).toBe(false)
		expect(op.filterFn(undefined, ['a'])).toBe(false)
	})

	it('"notIn" inverts "in"', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'notIn')
		if (!op) throw new Error('expected `notIn` operator')
		expect(op.filterFn('a', ['a', 'b'])).toBe(false)
		expect(op.filterFn('c', ['a', 'b'])).toBe(true)
	})

	it('returns true (no-op) for empty filter arrays — both `in` and `notIn`', () => {
		const inOp = IN_OPERATORS.find((o) => o.id === 'in')
		const notInOp = IN_OPERATORS.find((o) => o.id === 'notIn')
		if (!inOp || !notInOp) throw new Error('expected operators')
		expect(inOp.filterFn('a', [])).toBe(true)
		expect(notInOp.filterFn('a', [])).toBe(true)
	})
})

describe('DEFAULT_OPERATORS_BY_TYPE for select / badge', () => {
	it('includes `in` and `notIn` plus isEmpty variants', () => {
		for (const type of ['select', 'badge']) {
			const ops = DEFAULT_OPERATORS_BY_TYPE[type]
			if (!ops) throw new Error(`expected operators for ${type}`)
			const ids = ops.map((o) => o.id)
			expect(ids).toEqual(['in', 'notIn', 'isEmpty', 'isNotEmpty'])
		}
	})

	it('defaults operator id to "in" for select and badge', () => {
		expect(DEFAULT_OPERATOR_ID_BY_TYPE.select).toBe('in')
		expect(DEFAULT_OPERATOR_ID_BY_TYPE.badge).toBe('in')
	})
})

describe('buildOperatorRegistry + resolveColumnOperators', () => {
	it('includes built-in `in` / `notIn` in the global registry', () => {
		const registry = buildOperatorRegistry()
		expect(registry.get('in')).toBeDefined()
		expect(registry.get('notIn')).toBeDefined()
	})

	it('resolveColumnOperators returns cell-type operators when config is `true`', () => {
		const registry = buildOperatorRegistry()
		const selectOps = DEFAULT_OPERATORS_BY_TYPE.select
		const resolved = resolveColumnOperators(true, registry, selectOps)
		expect(resolved.map((o) => o.id)).toEqual(['in', 'notIn', 'isEmpty', 'isNotEmpty'])
	})
})

describe('createOperatorFilterFn — empty-array guard', () => {
	it('returns true when filter value is an empty array', () => {
		const registry = buildOperatorRegistry()
		const inOp = registry.get('in')
		if (!inOp) throw new Error('expected `in` operator')
		const fn = createOperatorFilterFn([inOp] as FilterOperatorDef[])
		const row = { getValue: () => 'a' }
		expect(fn(row, 'col', { operator: 'in', value: [] })).toBe(true)
	})

	it('applies the operator filterFn when array has entries', () => {
		const registry = buildOperatorRegistry()
		const inOp = registry.get('in')
		if (!inOp) throw new Error('expected `in` operator')
		const fn = createOperatorFilterFn([inOp] as FilterOperatorDef[])
		const row = { getValue: () => 'a' }
		expect(fn(row, 'col', { operator: 'in', value: ['a'] })).toBe(true)
		expect(fn(row, 'col', { operator: 'in', value: ['b'] })).toBe(false)
	})
})
