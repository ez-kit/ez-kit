import { describe, expect, it } from 'vitest'

import { deepMerge } from './deep-merge'

describe('deepMerge', () => {
	it('layers source scalars over target and keeps target-only keys', () => {
		const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })
		expect(result).toEqual({ a: 1, b: 3, c: 4 })
	})

	it('merges nested plain objects recursively', () => {
		const result = deepMerge({ pagination: { pageSize: 50, manual: false } }, { pagination: { manual: true } })
		expect(result).toEqual({ pagination: { pageSize: 50, manual: true } })
	})

	it('replaces a boolean target with a source object (enabled → configured)', () => {
		const result = deepMerge({ pagination: true }, { pagination: { pageSize: 20 } })
		expect(result).toEqual({ pagination: { pageSize: 20 } })
	})

	it('skips undefined source values so target wins', () => {
		const result = deepMerge({ sorting: true }, { sorting: undefined })
		expect(result).toEqual({ sorting: true })
	})

	it('replaces arrays wholesale instead of concatenating', () => {
		const result = deepMerge({ items: [1, 2] }, { items: [3] })
		expect(result).toEqual({ items: [3] })
	})

	it('does not mutate either argument', () => {
		const target = { pagination: { pageSize: 50 } }
		const source = { pagination: { manual: true } }
		deepMerge(target, source)
		expect(target).toEqual({ pagination: { pageSize: 50 } })
		expect(source).toEqual({ pagination: { manual: true } })
	})

	it('returns a fresh nested object, not a shared reference', () => {
		const nested = { pageSize: 50 }
		const result = deepMerge({ pagination: nested }, { pagination: { manual: true } })
		expect(result.pagination).not.toBe(nested)
	})
})
