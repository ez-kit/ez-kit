import { describe, expect, it } from 'vitest'

import { shallow } from './shallow-equal'

describe('shallow', () => {
	it('returns true for Object.is-equal primitives', () => {
		expect(shallow(1, 1)).toBe(true)
		expect(shallow('a', 'a')).toBe(true)
		expect(shallow(true, true)).toBe(true)
		expect(shallow(null, null)).toBe(true)
		expect(shallow(undefined, undefined)).toBe(true)
		expect(shallow(NaN, NaN)).toBe(true)
	})

	it('returns false for different primitives', () => {
		expect(shallow(1, 2)).toBe(false)
		expect(shallow('a', 'b')).toBe(false)
		expect(shallow(0, -0)).toBe(false)
	})

	it('returns true for same reference', () => {
		const obj = { a: 1 }
		expect(shallow(obj, obj)).toBe(true)
	})

	it('returns true for shallowly equal plain objects', () => {
		expect(shallow({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true)
	})

	it('returns false when object values differ', () => {
		expect(shallow({ a: 1 }, { a: 2 })).toBe(false)
	})

	it('does NOT recurse — nested objects compared by reference', () => {
		const nested = { x: 1 }
		expect(shallow({ a: nested }, { a: nested })).toBe(true)
		expect(shallow({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false)
	})

	it('returns false when key sets differ', () => {
		expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBe(false)
		expect(shallow({ a: 1, b: undefined }, { a: 1 })).toBe(false)
	})

	it('returns true for shallowly equal arrays', () => {
		expect(shallow([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(shallow([] as number[], [] as number[])).toBe(true)
	})

	it('returns false when array lengths differ or items differ', () => {
		expect(shallow([1, 2], [1, 2, 3])).toBe(false)
		expect(shallow([1, 2, 3], [1, 2, 4])).toBe(false)
	})

	it('returns false when one side is array and the other is plain object', () => {
		expect(shallow([1, 2] as unknown as { 0: number; 1: number }, { 0: 1, 1: 2 })).toBe(false)
		expect(shallow({ 0: 1, 1: 2 }, [1, 2] as unknown as { 0: number; 1: number })).toBe(false)
	})

	it('returns true for equal Maps', () => {
		expect(
			shallow(
				new Map([
					['a', 1],
					['b', 2],
				]),
				new Map([
					['a', 1],
					['b', 2],
				]),
			),
		).toBe(true)
	})

	it('returns false when Map sizes or entries differ', () => {
		expect(shallow(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
		expect(shallow(new Map([['a', 1]]), new Map<string, number>())).toBe(false)
	})

	it('returns true for equal Sets', () => {
		expect(shallow(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true)
	})

	it('returns false when Set sizes or elements differ', () => {
		expect(shallow(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false)
		expect(shallow(new Set([1, 2]), new Set([1, 3]))).toBe(false)
	})

	it('returns false across container types', () => {
		const mapAsObject: object = new Map<string, number>()
		const plainObject: object = {}
		expect(shallow(mapAsObject, plainObject)).toBe(false)

		const setAsObject: object = new Set<number>()
		const arrayAsObject: object = []
		expect(shallow(setAsObject, arrayAsObject)).toBe(false)
	})

	it('handles null vs object', () => {
		expect(shallow(null, {})).toBe(false)
		expect(shallow({}, null)).toBe(false)
	})
})
