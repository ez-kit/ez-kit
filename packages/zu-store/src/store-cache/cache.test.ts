import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createCacheInstance } from './cache-instance'
import { toTree } from './to-tree'

import type { StoreId } from './cache-types'

const makeStore = (n = 0) => createStore<{ n: number }>(() => ({ n }))

const makeId = (path: string[], name: string, id: string): StoreId => ({ path, name, id })

/** Helper to register + observe in one step (the React Provider flow). */
function mount(cache: ReturnType<typeof createCacheInstance>, entry: StoreId, gcTime = 1000) {
	const store = cache.register(entry, makeStore(), gcTime)
	cache.addObserver(entry)
	return store
}

describe('cache instance — core operations', () => {
	it('register creates once and is idempotent per identity', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId([], 'group', 'k')

		const a = cache.register(entry, makeStore(1), 1000)
		const b = cache.register(entry, makeStore(2), 1000)

		expect(a).toBe(b)
	})

	it('isolates entries by name for the same path and id', () => {
		const cache = createCacheInstance(1000)

		const a = cache.register(makeId([], 'group-a', 'k'), makeStore(1), 1000)
		const b = cache.register(makeId([], 'group-b', 'k'), makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('isolates entries by path for the same name and id', () => {
		const cache = createCacheInstance(1000)

		const a = cache.register(makeId(['page-1'], 'group', 'k'), makeStore(1), 1000)
		const b = cache.register(makeId(['page-2'], 'group', 'k'), makeStore(2), 1000)

		expect(a).not.toBe(b)
	})

	it('getCachedStore returns the mounted store and undefined on miss, without creating', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId(['page-1'], 'group', 'k')

		expect(cache.getCachedStore(makeId(['page-1'], 'group', 'missing'))).toBeUndefined()

		const store = cache.register(entry, makeStore(), 1000)
		// Not observed yet → not mounted → not visible.
		expect(cache.getCachedStore(entry)).toBeUndefined()

		cache.addObserver(entry)
		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('remove deletes a store', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId(['page-1'], 'group', 'k')
		mount(cache, entry)

		cache.remove(entry)

		expect(cache.getCachedStore(entry)).toBeUndefined()
	})
})

describe('cache instance — keys, toTree, prefix', () => {
	it('keys returns flat structural coordinates of mounted entries', () => {
		const cache = createCacheInstance(1000)
		const a = makeId(['page-1'], 'users', 'u1')
		const b = makeId(['page-1'], 'orders', 'o1')
		const c = makeId(['page-2'], 'users', 'u1')
		for (const entry of [a, b, c]) mount(cache, entry)

		expect(cache.keys()).toContainEqual({ path: ['page-1'], name: 'users', id: 'u1' })
		expect(cache.keys()).toContainEqual({ path: ['page-1'], name: 'orders', id: 'o1' })
		expect(cache.keys()).toContainEqual({ path: ['page-2'], name: 'users', id: 'u1' })
		expect(cache.keys()).toHaveLength(3)
	})

	it('keys(prefix) matches by path segment, not substring', () => {
		const cache = createCacheInstance(1000)
		mount(cache, makeId(['page-1'], 'g', 'k'))
		mount(cache, makeId(['page-12'], 'g', 'k'))

		expect(cache.keys(['page-1'])).toEqual([{ path: ['page-1'], name: 'g', id: 'k' }])
	})

	it('toTree(keys) nests path segments and maps name → ids at the leaf', () => {
		const cache = createCacheInstance(1000)
		const entries = [
			makeId(['page-1'], 'users', 'u1'),
			makeId(['page-1'], 'orders', 'o1'),
			makeId(['page-2'], 'users', 'u1'),
		]
		for (const entry of entries) mount(cache, entry)

		expect(toTree(cache.keys())).toEqual({
			'page-1': { users: ['u1'], orders: ['o1'] },
			'page-2': { users: ['u1'] },
		})
	})

	it('toTree composes with keys(prefix) to view a subtree', () => {
		const cache = createCacheInstance(1000)
		mount(cache, makeId(['page-1'], 'users', 'u1'))
		mount(cache, makeId(['page-2'], 'users', 'u1'))

		expect(toTree(cache.keys(['page-1']))).toEqual({ 'page-1': { users: ['u1'] } })
	})

	it('toTree is a pure function of its coords (works with hand-built input)', () => {
		expect(
			toTree([
				{ path: ['a'], name: 'g', id: 'k1' },
				{ path: ['a'], name: 'g', id: 'k2' },
			]),
		).toEqual({ a: { g: ['k1', 'k2'] } })
	})
})

describe('cache instance — clear', () => {
	it('clearAll (no prefix) removes everything', () => {
		const cache = createCacheInstance(1000)
		mount(cache, makeId(['page-1'], 'users', 'u1'))
		mount(cache, makeId(['page-2'], 'orders', 'o1'))

		cache.clear()
		expect(cache.keys()).toHaveLength(0)
	})

	it('clear(prefix) removes a subtree across groups and keeps siblings', () => {
		const cache = createCacheInstance(1000)
		const p1Users = makeId(['page-1'], 'users', 'u1')
		const p1Orders = makeId(['page-1'], 'orders', 'o1')
		const p2Users = makeId(['page-2'], 'users', 'u1')
		for (const entry of [p1Users, p1Orders, p2Users]) mount(cache, entry)

		cache.clear(['page-1'])

		expect(cache.getCachedStore(p1Users)).toBeUndefined()
		expect(cache.getCachedStore(p1Orders)).toBeUndefined()
		expect(cache.getCachedStore(p2Users)).toBeDefined()
		expect(cache.keys()).toEqual([{ path: ['page-2'], name: 'users', id: 'u1' }])
	})

	it('clear(prefix) emits a single notification regardless of subtree size', () => {
		const cache = createCacheInstance(1000)
		for (let i = 0; i < 10; i += 1) mount(cache, makeId(['page-1'], 'users', `u${String(i)}`))

		let notifications = 0
		const unsub = cache.cachedStores.subscribe(() => {
			notifications += 1
		})

		cache.clear(['page-1'])
		unsub()

		expect(notifications).toBe(1)
		expect(cache.keys()).toHaveLength(0)
	})

	it('clear(prefix) with no matches emits no notification', () => {
		const cache = createCacheInstance(1000)
		mount(cache, makeId(['page-1'], 'users', 'u1'))

		let notifications = 0
		const unsub = cache.cachedStores.subscribe(() => {
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
		const entry = makeId(['page-1'], 'group', 'k')
		mount(cache, entry, 1000)
		cache.removeObserver(entry)

		expect(cache.getCachedStore(entry)).not.toBeUndefined()
		vi.advanceTimersByTime(1001)
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('keeps the store if re-observed before gcTime', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId(['page-1'], 'group', 'k')
		const store = mount(cache, entry, 1000)
		cache.removeObserver(entry)

		vi.advanceTimersByTime(500)
		cache.addObserver(entry)
		vi.advanceTimersByTime(1000)

		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('never auto-evicts an alwaysCache (Infinity) entry', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId(['page-1'], 'group', 'k')
		const store = mount(cache, entry, Infinity)
		cache.removeObserver(entry)

		vi.advanceTimersByTime(10_000_000)
		expect(cache.getCachedStore(entry)).toBe(store)
	})

	it('manual remove overrides alwaysCache', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId(['page-1'], 'group', 'k')
		mount(cache, entry, Infinity)
		cache.removeObserver(entry)

		cache.remove(entry)
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})

	it('clear(prefix) overrides alwaysCache within the subtree', () => {
		const cache = createCacheInstance(1000)
		const entry = makeId(['page-1'], 'group', 'k')
		mount(cache, entry, Infinity)
		cache.removeObserver(entry)

		cache.clear(['page-1'])
		expect(cache.getCachedStore(entry)).toBeUndefined()
	})
})
