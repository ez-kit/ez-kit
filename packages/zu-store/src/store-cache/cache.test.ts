import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createCacheInstance } from './cache'

const makeStore = (n = 0) => createStore<{ n: number }>(() => ({ n }))

describe('cache instance — core operations', () => {
	it('getOrCreate creates once and is idempotent per key', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'
		let calls = 0

		const a = cache.getOrCreate(
			groupId,
			'k',
			() => {
				calls += 1
				return makeStore(1)
			},
			1000,
		)
		const b = cache.getOrCreate(
			groupId,
			'k',
			() => {
				calls += 1
				return makeStore(2)
			},
			1000,
		)

		expect(a).toBe(b)
		expect(calls).toBe(1)
	})

	it('isolates entries by groupId for the same key', () => {
		const cache = createCacheInstance(1000)
		const groupA = 'group-a'
		const groupB = 'group-b'

		const a = cache.getOrCreate(groupA, 'k', () => makeStore(1), 1000)
		const b = cache.getOrCreate(groupB, 'k', () => makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('getCachedStore returns the published store and undefined on miss, without creating', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'

		expect(cache.getCachedStore(groupId, 'missing')).toBeUndefined()

		const store = cache.getOrCreate(groupId, 'k', () => makeStore(), 1000)
		// Not observed yet → not published → not visible.
		expect(cache.getCachedStore(groupId, 'k')).toBeUndefined()

		cache.addObserver(groupId, 'k')
		expect(cache.getCachedStore(groupId, 'k')).toBe(store)
	})

	it('remove deletes a store', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'
		cache.getOrCreate(groupId, 'k', () => makeStore(), 1000)
		cache.addObserver(groupId, 'k')

		cache.remove(groupId, 'k')

		expect(cache.getCachedStore(groupId, 'k')).toBeUndefined()
	})

	it('clear removes everything and keys reflects published entries', () => {
		const cache = createCacheInstance(1000)
		const groupA = 'group-a'
		const groupB = 'group-b'
		cache.getOrCreate(groupA, 'a', () => makeStore(), 1000)
		cache.addObserver(groupA, 'a')
		cache.getOrCreate(groupB, 'b', () => makeStore(), 1000)
		cache.addObserver(groupB, 'b')

		expect(cache.keys().get(groupA)).toEqual(['a'])
		expect(cache.keys().get(groupB)).toEqual(['b'])

		cache.clear()
		expect(cache.keys().size).toBe(0)
	})
})

describe('cache instance — lazy sweep / gc', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('evicts after gcTime once observers reach zero', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'
		cache.getOrCreate(groupId, 'k', () => makeStore(), 1000)
		cache.addObserver(groupId, 'k')
		cache.removeObserver(groupId, 'k')

		expect(cache.getCachedStore(groupId, 'k')).not.toBeUndefined()
		vi.advanceTimersByTime(1001)
		expect(cache.getCachedStore(groupId, 'k')).toBeUndefined()
	})

	it('keeps the store if re-observed before gcTime', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'
		const store = cache.getOrCreate(groupId, 'k', () => makeStore(), 1000)
		cache.addObserver(groupId, 'k')
		cache.removeObserver(groupId, 'k')

		vi.advanceTimersByTime(500)
		cache.addObserver(groupId, 'k')
		vi.advanceTimersByTime(1000)

		expect(cache.getCachedStore(groupId, 'k')).toBe(store)
	})

	it('never auto-evicts an alwaysCache (Infinity) entry that is observed at least once', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'
		const store = cache.getOrCreate(groupId, 'k', () => makeStore(), Infinity)
		cache.addObserver(groupId, 'k')
		cache.removeObserver(groupId, 'k')

		vi.advanceTimersByTime(10_000_000)
		expect(cache.getCachedStore(groupId, 'k')).toBe(store)
	})

	it('manual remove overrides alwaysCache', () => {
		const cache = createCacheInstance(1000)
		const groupId = 'group'
		cache.getOrCreate(groupId, 'k', () => makeStore(), Infinity)
		cache.addObserver(groupId, 'k')
		cache.removeObserver(groupId, 'k')

		cache.remove(groupId, 'k')
		expect(cache.getCachedStore(groupId, 'k')).toBeUndefined()
	})

	it('reaps an orphan (never observed) after the default grace, even with Infinity gcTime', () => {
		const cache = createCacheInstance(2000)
		const groupId = 'group'
		cache.getOrCreate(groupId, 'k', () => makeStore(), Infinity)
		// Never observed (simulates a discarded render).
		vi.advanceTimersByTime(2001)
		cache.addObserver(groupId, 'k')
		// addObserver on a removed store is a no-op; it is gone.
		expect(cache.getCachedStore(groupId, 'k')).toBeUndefined()
	})
})
