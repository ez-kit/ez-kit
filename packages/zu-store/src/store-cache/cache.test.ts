import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createCacheInstance } from './cache-instance'
import { toTree } from './to-tree'

import type { EntryId } from './cache-types'

const makeStore = (n = 0) => createStore<{ n: number }>(() => ({ n }))

const id = (path: string[], group: string, cacheKey: string): EntryId => ({ path, group, cacheKey })

/** Helper to register + observe in one step (the React Provider flow). */
function mount(cache: ReturnType<typeof createCacheInstance>, entry: EntryId, gcTime = 1000) {
	const store = cache.register(entry, makeStore(), gcTime)
	cache.addObserver(entry)
	return store
}

describe('cache instance — core operations', () => {
	it('register creates once and is idempotent per identity', () => {
		const cache = createCacheInstance(1000)
		const entry = id([], 'group', 'k')

		const a = cache.register(entry, makeStore(1), 1000)
		const b = cache.register(entry, makeStore(2), 1000)

		expect(a).toBe(b)
	})

	it('isolates entries by group for the same path and cacheKey', () => {
		const cache = createCacheInstance(1000)

		const a = cache.register(id([], 'group-a', 'k'), makeStore(1), 1000)
		const b = cache.register(id([], 'group-b', 'k'), makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('isolates entries by path for the same group and cacheKey', () => {
		const cache = createCacheInstance(1000)

		const a = cache.register(id(['page-1'], 'group', 'k'), makeStore(1), 1000)
		const b = cache.register(id(['page-2'], 'group', 'k'), makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('getCachedStore returns the published store and undefined on miss, without creating', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')

		expect(cache.getCachedStore(id(['page-1'], 'group', 'missing'))).toBeUndefined()

		const store = cache.register(entry, makeStore(), 1000)
		// Not observed yet → not published → not visible.
		expect(cache.getCachedStore(entry)).toBeUndefined()

		cache.addObserver(entry)
		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('remove deletes a store', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		mount(cache, entry)

		cache.remove(entry)

		expect(cache.getCachedStore(entry)).toBeUndefined()
	})
})

describe('cache instance — keys, toTree, prefix', () => {
	it('keys returns flat structural coordinates of published entries', () => {
		const cache = createCacheInstance(1000)
		const a = id(['page-1'], 'users', 'u1')
		const b = id(['page-1'], 'orders', 'o1')
		const c = id(['page-2'], 'users', 'u1')
		for (const entry of [a, b, c]) mount(cache, entry)

		expect(cache.keys()).toContainEqual({ path: ['page-1'], group: 'users', cacheKey: 'u1' })
		expect(cache.keys()).toContainEqual({ path: ['page-1'], group: 'orders', cacheKey: 'o1' })
		expect(cache.keys()).toContainEqual({ path: ['page-2'], group: 'users', cacheKey: 'u1' })
		expect(cache.keys()).toHaveLength(3)
	})

	it('keys(prefix) matches by path segment, not substring', () => {
		const cache = createCacheInstance(1000)
		mount(cache, id(['page-1'], 'g', 'k'))
		mount(cache, id(['page-12'], 'g', 'k'))

		expect(cache.keys(['page-1'])).toEqual([{ path: ['page-1'], group: 'g', cacheKey: 'k' }])
	})

	it('toTree(keys) nests path segments and maps group → cacheKeys at the leaf', () => {
		const cache = createCacheInstance(1000)
		const entries = [
			id(['page-1'], 'users', 'u1'),
			id(['page-1'], 'orders', 'o1'),
			id(['page-2'], 'users', 'u1'),
		]
		for (const entry of entries) mount(cache, entry)

		expect(toTree(cache.keys())).toEqual({
			'page-1': { users: ['u1'], orders: ['o1'] },
			'page-2': { users: ['u1'] },
		})
	})

	it('toTree composes with keys(prefix) to view a subtree', () => {
		const cache = createCacheInstance(1000)
		mount(cache, id(['page-1'], 'users', 'u1'))
		mount(cache, id(['page-2'], 'users', 'u1'))

		expect(toTree(cache.keys(['page-1']))).toEqual({ 'page-1': { users: ['u1'] } })
	})

	it('toTree is a pure function of its coords (works with hand-built input)', () => {
		expect(
			toTree([
				{ path: ['a'], group: 'g', cacheKey: 'k1' },
				{ path: ['a'], group: 'g', cacheKey: 'k2' },
			]),
		).toEqual({ a: { g: ['k1', 'k2'] } })
	})
})

describe('cache instance — clear', () => {
	it('clearAll (no prefix) removes everything', () => {
		const cache = createCacheInstance(1000)
		mount(cache, id(['page-1'], 'users', 'u1'))
		mount(cache, id(['page-2'], 'orders', 'o1'))

		cache.clear()
		expect(cache.keys()).toHaveLength(0)
	})

	it('clear(prefix) removes a subtree across groups and keeps siblings', () => {
		const cache = createCacheInstance(1000)
		const p1Users = id(['page-1'], 'users', 'u1')
		const p1Orders = id(['page-1'], 'orders', 'o1')
		const p2Users = id(['page-2'], 'users', 'u1')
		for (const entry of [p1Users, p1Orders, p2Users]) mount(cache, entry)

		cache.clear(['page-1'])

		expect(cache.getCachedStore(p1Users)).toBeUndefined()
		expect(cache.getCachedStore(p1Orders)).toBeUndefined()
		expect(cache.getCachedStore(p2Users)).toBeDefined()
		expect(cache.keys()).toEqual([{ path: ['page-2'], group: 'users', cacheKey: 'u1' }])
	})

	it('clear(prefix) emits a single notification regardless of subtree size', () => {
		const cache = createCacheInstance(1000)
		for (let i = 0; i < 10; i += 1) mount(cache, id(['page-1'], 'users', `u${String(i)}`))

		let notifications = 0
		const unsub = cache.publishedStores.subscribe(() => {
			notifications += 1
		})

		cache.clear(['page-1'])
		unsub()

		expect(notifications).toBe(1)
		expect(cache.keys()).toHaveLength(0)
	})

	it('clear(prefix) with no matches emits no notification', () => {
		const cache = createCacheInstance(1000)
		mount(cache, id(['page-1'], 'users', 'u1'))

		let notifications = 0
		const unsub = cache.publishedStores.subscribe(() => {
			notifications += 1
		})

		cache.clear(['nonexistent'])
		unsub()

		expect(notifications).toBe(0)
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
		mount(cache, entry, 1000)
		cache.removeObserver(entry)

		expect(cache.getCachedStore(entry)).not.toBeUndefined()
		vi.advanceTimersByTime(1001)
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('keeps the store if re-observed before gcTime', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		const store = mount(cache, entry, 1000)
		cache.removeObserver(entry)

		vi.advanceTimersByTime(500)
		cache.addObserver(entry)
		vi.advanceTimersByTime(1000)

		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('never auto-evicts an alwaysCache (Infinity) entry', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		const store = mount(cache, entry, Infinity)
		cache.removeObserver(entry)

		vi.advanceTimersByTime(10_000_000)
		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('manual remove overrides alwaysCache', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		mount(cache, entry, Infinity)
		cache.removeObserver(entry)

		cache.remove(entry)
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('clear(prefix) overrides alwaysCache within the subtree', () => {
		const cache = createCacheInstance(1000)
		const entry = id(['page-1'], 'group', 'k')
		mount(cache, entry, Infinity)
		cache.removeObserver(entry)

		cache.clear(['page-1'])
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})
})
