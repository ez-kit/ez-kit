import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createCacheInstance, toTree, type EntryId } from './cache'

const makeStore = (n = 0) => createStore<{ n: number }>(() => ({ n }))

const id = (path: string[], group: string, key: string): EntryId => ({ path, group, key })

describe('cache instance — core operations', () => {
	it('getOrCreate creates once and is idempotent per identity', () => {
		const cache = createCacheInstance(1000)
		let calls = 0

		const a = cache.getOrCreate(
			id([], 'group', 'k'),
			() => {
				calls += 1
				return makeStore(1)
			},
			1000,
		)
		const b = cache.getOrCreate(
			id([], 'group', 'k'),
			() => {
				calls += 1
				return makeStore(2)
			},
			1000,
		)

		expect(a).toBe(b)
		expect(calls).toBe(1)
	})

	it('isolates entries by group for the same path and key', () => {
		const cache = createCacheInstance(1000)

		const a = cache.getOrCreate(id([], 'group-a', 'k'), () => makeStore(1), 1000)
		const b = cache.getOrCreate(id([], 'group-b', 'k'), () => makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('isolates entries by path for the same group and key', () => {
		const cache = createCacheInstance(1000)

		const a = cache.getOrCreate(id(['page-1'], 'group', 'k'), () => makeStore(1), 1000)
		const b = cache.getOrCreate(id(['page-2'], 'group', 'k'), () => makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('getCachedStore returns the published store and undefined on miss, without creating', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')

		expect(cache.getCachedStore(id(['page-1'], 'group', 'missing'))).toBeUndefined()

		const store = cache.getOrCreate(entry, () => makeStore(), 1000)
		// Not observed yet → not published → not visible.
		expect(cache.getCachedStore(entry)).toBeUndefined()

		cache.addObserver(entry)
		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('remove deletes a store', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		cache.getOrCreate(entry, () => makeStore(), 1000)
		cache.addObserver(entry)

		cache.remove(entry)

		expect(cache.getCachedStore(entry)).toBeUndefined()
	})
})

describe('cache instance — keys, tree, prefix', () => {
	it('keys returns flat structural coordinates of published entries', () => {
		const cache = createCacheInstance(1000)
		const a = id(['page-1'], 'users', 'u1')
		const b = id(['page-1'], 'orders', 'o1')
		const c = id(['page-2'], 'users', 'u1')
		for (const entry of [a, b, c]) {
			cache.getOrCreate(entry, () => makeStore(), 1000)
			cache.addObserver(entry)
		}

		expect(cache.keys()).toContainEqual({ path: ['page-1'], group: 'users', key: 'u1' })
		expect(cache.keys()).toContainEqual({ path: ['page-1'], group: 'orders', key: 'o1' })
		expect(cache.keys()).toContainEqual({ path: ['page-2'], group: 'users', key: 'u1' })
		expect(cache.keys()).toHaveLength(3)
	})

	it('keys(prefix) matches by path segment, not substring', () => {
		const cache = createCacheInstance(1000)
		const a = id(['page-1'], 'g', 'k')
		const b = id(['page-12'], 'g', 'k')
		for (const entry of [a, b]) {
			cache.getOrCreate(entry, () => makeStore(), 1000)
			cache.addObserver(entry)
		}

		const matched = cache.keys(['page-1'])
		expect(matched).toEqual([{ path: ['page-1'], group: 'g', key: 'k' }])
	})

	it('toTree(keys) nests path segments and maps group → keys at the leaf', () => {
		const cache = createCacheInstance(1000)
		const entries = [id(['page-1'], 'users', 'u1'), id(['page-1'], 'orders', 'o1'), id(['page-2'], 'users', 'u1')]
		for (const entry of entries) {
			cache.getOrCreate(entry, () => makeStore(), 1000)
			cache.addObserver(entry)
		}

		expect(toTree(cache.keys())).toEqual({
			'page-1': { users: ['u1'], orders: ['o1'] },
			'page-2': { users: ['u1'] },
		})
	})

	it('toTree composes with keys(prefix) to view a subtree', () => {
		const cache = createCacheInstance(1000)
		const entries = [id(['page-1'], 'users', 'u1'), id(['page-2'], 'users', 'u1')]
		for (const entry of entries) {
			cache.getOrCreate(entry, () => makeStore(), 1000)
			cache.addObserver(entry)
		}

		expect(toTree(cache.keys(['page-1']))).toEqual({ 'page-1': { users: ['u1'] } })
	})

	it('toTree is a pure function of its coords (works with hand-built input)', () => {
		expect(
			toTree([
				{ path: ['a'], group: 'g', key: 'k1' },
				{ path: ['a'], group: 'g', key: 'k2' },
			]),
		).toEqual({ a: { g: ['k1', 'k2'] } })
	})
})

describe('cache instance — clear', () => {
	it('clear() removes everything', () => {
		const cache = createCacheInstance(1000)
		const a = id(['page-1'], 'users', 'u1')
		const b = id(['page-2'], 'orders', 'o1')
		for (const entry of [a, b]) {
			cache.getOrCreate(entry, () => makeStore(), 1000)
			cache.addObserver(entry)
		}

		cache.clear()
		expect(cache.keys()).toHaveLength(0)
	})

	it('clear(prefix) removes a subtree across groups and keeps siblings', () => {
		const cache = createCacheInstance(1000)
		const p1Users = id(['page-1'], 'users', 'u1')
		const p1Orders = id(['page-1'], 'orders', 'o1')
		const p2Users = id(['page-2'], 'users', 'u1')
		for (const entry of [p1Users, p1Orders, p2Users]) {
			cache.getOrCreate(entry, () => makeStore(), 1000)
			cache.addObserver(entry)
		}

		cache.clear(['page-1'])

		expect(cache.getCachedStore(p1Users)).toBeUndefined()
		expect(cache.getCachedStore(p1Orders)).toBeUndefined()
		expect(cache.getCachedStore(p2Users)).toBeDefined()
		expect(cache.keys()).toEqual([{ path: ['page-2'], group: 'users', key: 'u1' }])
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
		const entry = id(['page-1'], 'group', 'k')
		cache.getOrCreate(entry, () => makeStore(), 1000)
		cache.addObserver(entry)
		cache.removeObserver(entry)

		expect(cache.getCachedStore(entry)).not.toBeUndefined()
		vi.advanceTimersByTime(1001)
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('keeps the store if re-observed before gcTime', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		const store = cache.getOrCreate(entry, () => makeStore(), 1000)
		cache.addObserver(entry)
		cache.removeObserver(entry)

		vi.advanceTimersByTime(500)
		cache.addObserver(entry)
		vi.advanceTimersByTime(1000)

		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('never auto-evicts an alwaysCache (Infinity) entry that is observed at least once', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		const store = cache.getOrCreate(entry, () => makeStore(), Infinity)
		cache.addObserver(entry)
		cache.removeObserver(entry)

		vi.advanceTimersByTime(10_000_000)
		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('manual remove overrides alwaysCache', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		cache.getOrCreate(entry, () => makeStore(), Infinity)
		cache.addObserver(entry)
		cache.removeObserver(entry)

		cache.remove(entry)
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('clear(prefix) overrides alwaysCache within the subtree', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		cache.getOrCreate(entry, () => makeStore(), Infinity)
		cache.addObserver(entry)
		cache.removeObserver(entry)

		cache.clear(['page-1'])
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('reaps an orphan (never observed) after the default grace, even with Infinity gcTime', () => {
		const cache = createCacheInstance(2000)
		const entry = id(['page-1'], 'group', 'k')
		cache.getOrCreate(entry, () => makeStore(), Infinity)
		// Never observed (simulates a discarded render).
		vi.advanceTimersByTime(2001)
		cache.addObserver(entry)
		// addObserver on a removed store is a no-op; it is gone.
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})
})
