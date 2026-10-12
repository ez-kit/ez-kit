import { describe, expect, test } from 'vitest'

import { collectRuleFields, compileCondition, getValueAtPath, setValueAtPath } from './rules'

describe('getValueAtPath', () => {
	test('reads a dotted path', () => {
		expect(getValueAtPath({ company: { inn: '77' } }, 'company.inn')).toBe('77')
	})

	test('returns undefined for a missing path instead of throwing', () => {
		expect(getValueAtPath({}, 'company.inn')).toBeUndefined()
	})
})

describe('setValueAtPath', () => {
	test('writes a flat key', () => {
		expect(setValueAtPath({}, 'inn', '77')).toEqual({ inn: '77' })
	})

	test('builds the intermediate objects a dotted path needs', () => {
		expect(setValueAtPath({}, 'company.inn', '77')).toEqual({ company: { inn: '77' } })
	})

	test('round-trips with getValueAtPath', () => {
		const written = setValueAtPath({}, 'a.b.c', 1)
		expect(getValueAtPath(written, 'a.b.c')).toBe(1)
	})

	test('keeps sibling keys at every level', () => {
		const source = { company: { name: 'Acme' }, other: 1 }
		expect(setValueAtPath(source, 'company.inn', '77')).toEqual({
			company: { name: 'Acme', inn: '77' },
			other: 1,
		})
	})

	test('never mutates its input, at any level', () => {
		const source = { company: { name: 'Acme' } }
		const written = setValueAtPath(source, 'company.inn', '77')
		expect(source).toEqual({ company: { name: 'Acme' } })
		expect(written).not.toBe(source)
		expect((written as { company: unknown }).company).not.toBe(source.company)
	})

	test('writes array indices, in both `[n]` and `.n` spellings', () => {
		expect(setValueAtPath({}, 'items[1].sku', 'X')).toEqual({ items: [undefined, { sku: 'X' }] })
		expect(setValueAtPath({}, 'items.0', 'A')).toEqual({ items: ['A'] })
	})

	test('preserves the other entries of an existing array', () => {
		const source = { items: ['a', 'b'] }
		expect(setValueAtPath(source, 'items[1]', 'B')).toEqual({ items: ['a', 'B'] })
		expect(source.items).toEqual(['a', 'b'])
	})

	test('replaces a scalar standing where a container is needed', () => {
		expect(setValueAtPath({ company: 'Acme' }, 'company.inn', '77')).toEqual({ company: { inn: '77' } })
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

	test('rejects a relative reference outside an item scope', () => {
		expect(() => compileCondition({ field: './type', eq: 'x' })).toThrow(/relative/i)
	})

	test('resolves a relative reference against the item it was given', () => {
		const predicate = compileCondition({ field: './type', eq: 'person' }, 'people[1]')
		expect(predicate({ people: [{ type: 'business' }, { type: 'person' }] })).toBe(true)
		expect(predicate({ people: [{ type: 'person' }, { type: 'business' }] })).toBe(false)
	})

	test('an absolute reference still reaches the form root from inside an item', () => {
		const predicate = compileCondition({ field: 'country', eq: 'RU' }, 'people[0]')
		expect(predicate({ country: 'RU', people: [{ type: 'x' }] })).toBe(true)
	})

	test('carries the item scope through and / or / not', () => {
		const predicate = compileCondition(
			{ and: [{ field: './type', eq: 'person' }, { not: { field: './hidden', truthy: true } }] },
			'people[0]',
		)
		expect(predicate({ people: [{ type: 'person', hidden: false }] })).toBe(true)
		expect(predicate({ people: [{ type: 'person', hidden: true }] })).toBe(false)
	})

	test('resolves a relative reference against a nested item scope', () => {
		const predicate = compileCondition({ field: './label', eq: 'x' }, 'people[0].tags[2]')
		expect(predicate({ people: [{ tags: [{}, {}, { label: 'x' }] }] })).toBe(true)
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

	test('resolves relative references against the item scope, so subscriptions are real paths', () => {
		expect(
			collectRuleFields(
				{
					and: [
						{ field: './type', eq: 1 },
						{ field: 'country', eq: 2 },
					],
				},
				'people[1]',
			),
		).toEqual(['people[1].type', 'country'])
	})
})
