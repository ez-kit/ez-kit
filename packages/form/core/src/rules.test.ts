import { describe, expect, test } from 'vitest'

import { collectRuleFields, compileCondition, getValueAtPath } from './rules'

describe('getValueAtPath', () => {
	test('reads a dotted path', () => {
		expect(getValueAtPath({ company: { inn: '77' } }, 'company.inn')).toBe('77')
	})

	test('returns undefined for a missing path instead of throwing', () => {
		expect(getValueAtPath({}, 'company.inn')).toBeUndefined()
	})
})

describe('compileCondition', () => {
	test('passes a function condition through unchanged', () => {
		const predicate = compileCondition((values: { a: number }) => values.a > 1)
		expect(predicate({ a: 2 })).toBe(true)
	})

	test('eq compares strictly', () => {
		const predicate = compileCondition({ field: 'clientType', eq: 'business' })
		expect(predicate({ clientType: 'business' })).toBe(true)
		expect(predicate({ clientType: 'person' })).toBe(false)
	})

	test('in, gt, lt and truthy', () => {
		expect(compileCondition({ field: 'a', in: [1, 2] })({ a: 2 })).toBe(true)
		expect(compileCondition({ field: 'a', gt: 5 })({ a: 6 })).toBe(true)
		expect(compileCondition({ field: 'a', lt: 5 })({ a: 6 })).toBe(false)
		expect(compileCondition({ field: 'a', truthy: true })({ a: '' })).toBe(false)
	})

	test('and, or and not compose', () => {
		const predicate = compileCondition({
			and: [{ field: 'type', eq: 'business' }, { not: { field: 'country', eq: 'RU' } }],
		})
		expect(predicate({ type: 'business', country: 'DE' })).toBe(true)
		expect(predicate({ type: 'business', country: 'RU' })).toBe(false)
	})

	test('a gt comparison against a non-number is false, never NaN-truthy', () => {
		expect(compileCondition({ field: 'a', gt: 1 })({ a: 'x' })).toBe(false)
	})

	test('rejects a relative reference — reserved for arrays, unusable in v1', () => {
		expect(() => compileCondition({ field: './type', eq: 'x' })).toThrow(/relative/i)
	})
})

describe('collectRuleFields', () => {
	test('lists every field a rule tree reads', () => {
		expect(collectRuleFields({ and: [{ field: 'a', eq: 1 }, { not: { field: 'b', truthy: true } }] })).toEqual([
			'a',
			'b',
		])
	})

	test('returns an empty list for a function condition', () => {
		expect(collectRuleFields(() => true)).toEqual([])
	})
})
