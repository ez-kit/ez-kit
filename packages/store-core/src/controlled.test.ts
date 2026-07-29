import { describe, expect, it } from 'vitest'

import { getChangedControlledEntries, pickControlledKeys, shallowEqual } from './controlled'

import type { ControlledConfig } from './controlled'

type CounterState = {
	count: number
	label: string
	users: readonly string[]
}

describe('getChangedControlledEntries', () => {
	it('returns an empty object when next is undefined', () => {
		expect(getChangedControlledEntries<CounterState>({ count: 1 }, undefined)).toStrictEqual({})
	})

	it('returns an empty object when next is empty', () => {
		expect(getChangedControlledEntries<CounterState>({ count: 1 }, {})).toStrictEqual({})
	})

	it('treats every key as changed on the initial mount, where previous is undefined', () => {
		expect(getChangedControlledEntries<CounterState>(undefined, { count: 1, label: 'a' })).toStrictEqual({
			count: 1,
			label: 'a',
		})
	})

	it('reports only the key whose value actually changed', () => {
		const changed = getChangedControlledEntries<CounterState>({ count: 1, label: 'a' }, { count: 1, label: 'b' })
		expect(changed).toStrictEqual({ label: 'b' })
	})

	it('reports nothing when every key holds the same value by Object.is', () => {
		const previous = { count: 1, label: 'a' }
		const next = { count: 1, label: 'a' }
		expect(getChangedControlledEntries<CounterState>(previous, next)).toStrictEqual({})
	})

	it('respects a custom equals for a key, suppressing a same-value new reference', () => {
		const controlled: ControlledConfig<CounterState> = { users: { equals: shallowEqual } }
		const previous = { users: ['a', 'b'] }
		const next = { users: ['a', 'b'] } // fresh array reference, same contents

		expect(getChangedControlledEntries(previous, next, controlled)).toStrictEqual({})
	})

	it('still reports a change when a custom equals says the values differ', () => {
		const controlled: ControlledConfig<CounterState> = { users: { equals: shallowEqual } }
		const previous = { users: ['a', 'b'] }
		const next = { users: ['a', 'c'] }

		expect(getChangedControlledEntries(previous, next, controlled)).toStrictEqual({ users: ['a', 'c'] })
	})

	it('follows Object.is semantics for NaN (equal) and -0 vs 0 (not equal)', () => {
		expect(getChangedControlledEntries<CounterState>({ count: Number.NaN }, { count: Number.NaN })).toStrictEqual({})
		expect(getChangedControlledEntries<CounterState>({ count: 0 }, { count: -0 })).toStrictEqual({ count: -0 })
	})

	it('treats a key newly present in next, but absent from previous, as changed', () => {
		expect(getChangedControlledEntries<CounterState>({}, { count: 1 })).toStrictEqual({ count: 1 })
	})
})

describe('shallowEqual', () => {
	it('is true for the same reference and for primitives equal by Object.is', () => {
		expect(shallowEqual(1, 1)).toBe(true)
		expect(shallowEqual('a', 'a')).toBe(true)
		expect(shallowEqual(Number.NaN, Number.NaN)).toBe(true)
	})

	it('is false when only one side is an object', () => {
		expect(shallowEqual({ a: 1 }, null)).toBe(false)
		expect(shallowEqual(null, { a: 1 })).toBe(false)
	})

	it('compares plain objects one level deep, ignoring key order', () => {
		expect(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
		expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
	})

	it('is false when objects have a different number of keys', () => {
		expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
	})

	it('compares arrays one level deep, by index', () => {
		expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false)
	})

	it('is false when arrays have different lengths', () => {
		expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false)
	})

	it('is false when one side is an array and the other is a plain object', () => {
		expect(shallowEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
	})

	it('does not deep-compare nested objects/arrays — a fresh nested reference breaks equality', () => {
		expect(shallowEqual({ nested: { a: 1 } }, { nested: { a: 1 } })).toBe(false)
	})
})

describe('pickControlledKeys', () => {
	it('projects only the requested keys', () => {
		const state: CounterState = { count: 1, label: 'a', users: ['x'] }
		expect(pickControlledKeys(state, ['count'])).toStrictEqual({ count: 1 })
	})

	it('returns an empty object when keys is empty', () => {
		const state: CounterState = { count: 1, label: 'a', users: ['x'] }
		expect(pickControlledKeys(state, [])).toStrictEqual({})
	})
})
