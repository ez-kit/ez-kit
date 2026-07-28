import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createServiceRegistry } from '../service'

import { createInstanceCache } from './instance-cache'

import type { PluginContext, StorePlugin } from '../plugin'
import type { StoreId } from '../store-id'
import type { MockInstance } from 'vitest'

const GC_TIME = 1000

function ctxFor(id: StoreId): PluginContext {
	return { services: createServiceRegistry(), id, isServer: false }
}

function idOf(path: readonly string[], id: string): StoreId {
	return { path, name: 'group', id }
}

describe('createInstanceCache', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('creates on miss and runs each plugin setup once', () => {
		const cache = createInstanceCache()
		const setupA = vi.fn(() => undefined)
		const setupB = vi.fn(() => undefined)
		const create = vi.fn(() => ({ value: 1 }))
		const id = idOf([], 'a')
		const plugins: StorePlugin<{ value: number }>[] = [
			{ name: 'a', setup: setupA },
			{ name: 'b', setup: setupB },
		]

		const instance = cache.getOrCreate(id, create, { gcTime: GC_TIME, plugins, context: ctxFor(id) })

		expect(instance).toEqual({ value: 1 })
		expect(create).toHaveBeenCalledTimes(1)
		expect(setupA).toHaveBeenCalledTimes(1)
		expect(setupB).toHaveBeenCalledTimes(1)
		expect(setupA).toHaveBeenCalledWith(instance, expect.objectContaining({ id, isServer: false }))
	})

	it('returns the same instance on hit without re-running create or setup', () => {
		const cache = createInstanceCache()
		const setup = vi.fn(() => undefined)
		const create = vi.fn(() => ({ value: 1 }))
		const id = idOf([], 'a')
		const plugins: StorePlugin<{ value: number }>[] = [{ name: 'a', setup }]

		const first = cache.getOrCreate(id, create, { gcTime: GC_TIME, plugins, context: ctxFor(id) })
		const second = cache.getOrCreate(id, create, { gcTime: GC_TIME, plugins, context: ctxFor(id) })

		expect(second).toBe(first)
		expect(create).toHaveBeenCalledTimes(1)
		expect(setup).toHaveBeenCalledTimes(1)
	})

	it('runs cleanups once on clear, then drops the entry', () => {
		const cache = createInstanceCache()
		const cleanup = vi.fn()
		const id = idOf([], 'a')
		const plugins: StorePlugin<object>[] = [{ name: 'a', setup: () => cleanup }]

		cache.getOrCreate(id, () => ({}), { gcTime: GC_TIME, plugins, context: ctxFor(id) })
		cache.addObserver(id)
		cache.clear()

		expect(cleanup).toHaveBeenCalledTimes(1)
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('evicts an idle entry after gcTime and runs its cleanups', () => {
		const cache = createInstanceCache()
		const cleanup = vi.fn()
		const id = idOf([], 'a')
		const plugins: StorePlugin<object>[] = [{ name: 'a', setup: () => cleanup }]

		cache.getOrCreate(id, () => ({}), { gcTime: GC_TIME, plugins, context: ctxFor(id) })
		cache.addObserver(id)
		cache.removeObserver(id)

		expect(cache.getInstance(id)).toBeDefined()
		vi.advanceTimersByTime(GC_TIME)
		expect(cleanup).toHaveBeenCalledTimes(1)
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('retains an entry re-observed before the eviction deadline', () => {
		const cache = createInstanceCache()
		const cleanup = vi.fn()
		const id = idOf([], 'a')
		const plugins: StorePlugin<object>[] = [{ name: 'a', setup: () => cleanup }]

		const first = cache.getOrCreate(id, () => ({}), { gcTime: GC_TIME, plugins, context: ctxFor(id) })
		cache.addObserver(id)
		cache.removeObserver(id)
		vi.advanceTimersByTime(GC_TIME / 2)
		cache.addObserver(id)
		vi.advanceTimersByTime(GC_TIME)

		expect(cleanup).not.toHaveBeenCalled()
		expect(cache.getInstance(id)).toBe(first)
	})

	it('pins an entry with gcTime Infinity against automatic eviction', () => {
		const cache = createInstanceCache()
		const cleanup = vi.fn()
		const id = idOf([], 'a')
		const plugins: StorePlugin<object>[] = [{ name: 'a', setup: () => cleanup }]

		cache.getOrCreate(id, () => ({}), { gcTime: Infinity, plugins, context: ctxFor(id) })
		cache.addObserver(id)
		cache.removeObserver(id)
		vi.advanceTimersByTime(60 * 60 * 1000)

		expect(cleanup).not.toHaveBeenCalled()
		expect(cache.getInstance(id)).toBeDefined()
	})

	it('clears only the matching subtree on a prefix clear and runs their cleanups', () => {
		const cache = createInstanceCache()
		const cleanupUsers = vi.fn()
		const cleanupOrg = vi.fn()
		const usersId = idOf(['users'], 'u1')
		const orgId = idOf(['org'], 'o1')

		cache.getOrCreate(usersId, () => ({}), {
			gcTime: Infinity,
			plugins: [{ name: 'u', setup: () => cleanupUsers }],
			context: ctxFor(usersId),
		})
		cache.addObserver(usersId)
		cache.getOrCreate(orgId, () => ({}), {
			gcTime: Infinity,
			plugins: [{ name: 'o', setup: () => cleanupOrg }],
			context: ctxFor(orgId),
		})
		cache.addObserver(orgId)

		cache.clear(['users'])

		expect(cleanupUsers).toHaveBeenCalledTimes(1)
		expect(cleanupOrg).not.toHaveBeenCalled()
		expect(cache.getInstance(usersId)).toBeUndefined()
		expect(cache.getInstance(orgId)).toBeDefined()
	})

	it('reflects live entries in keys and the membership snapshot', () => {
		const cache = createInstanceCache()
		const id = idOf(['users'], 'u1')
		cache.getOrCreate(id, () => ({}), { gcTime: GC_TIME, plugins: [], context: ctxFor(id) })
		cache.addObserver(id)

		expect(cache.keys()).toEqual([{ path: ['users'], name: 'group', id: 'u1' }])
		expect(cache.getKeysSnapshot()).toBe(cache.getKeysSnapshot())
	})

	it('does not run cleanups twice when an entry is evicted then cleared', () => {
		const cache = createInstanceCache()
		const cleanup = vi.fn()
		const id = idOf([], 'a')

		cache.getOrCreate(id, () => ({}), {
			gcTime: GC_TIME,
			plugins: [{ name: 'a', setup: () => cleanup }],
			context: ctxFor(id),
		})
		cache.addObserver(id)
		cache.removeObserver(id)
		vi.advanceTimersByTime(GC_TIME)
		cache.clear()

		expect(cleanup).toHaveBeenCalledTimes(1)
	})
})

/**
 * The eviction timer and the idle stamp read two different clocks: `setTimeout` runs on the
 * runtime's monotonic timer clock, while `idleSince` is stamped from the wall clock (`Date.now`).
 * They drift, so the timer can fire while the wall clock still reports slightly less than `gcTime`
 * elapsed. These tests pin that the timer — not a wall-clock comparison — decides the deadline.
 *
 * Only `setTimeout`/`clearTimeout` are faked here; `Date.now` is stubbed separately so the two
 * clocks can be moved independently, which is exactly what the shared fake-timer setup above hides.
 */
describe('createInstanceCache — eviction deadline under clock drift', () => {
	/** Wall clock lags the timer clock by this much when the eviction timer fires. */
	const DRIFT = 1
	const START = 1_000_000

	let wallClock: MockInstance<() => number>

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
		wallClock = vi.spyOn(Date, 'now').mockReturnValue(START)
	})
	afterEach(() => {
		wallClock.mockRestore()
		vi.useRealTimers()
	})

	it('evicts an idle entry when the timer fires marginally early on the wall clock', () => {
		const cache = createInstanceCache()
		const cleanup = vi.fn()
		const id = idOf([], 'a')

		cache.getOrCreate(id, () => ({}), {
			gcTime: GC_TIME,
			plugins: [{ name: 'a', setup: () => cleanup }],
			context: ctxFor(id),
		})
		cache.addObserver(id)
		cache.removeObserver(id)

		// The timer clock reaches the deadline; the wall clock is still one tick short of it.
		wallClock.mockReturnValue(START + GC_TIME - DRIFT)
		vi.advanceTimersByTime(GC_TIME)

		expect(cleanup).toHaveBeenCalledTimes(1)
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('does not strand an entry forever when its eviction timer fires early', () => {
		const cache = createInstanceCache()
		const id = idOf([], 'a')

		cache.getOrCreate(id, () => ({}), { gcTime: GC_TIME, plugins: [], context: ctxFor(id) })
		cache.addObserver(id)
		cache.removeObserver(id)

		wallClock.mockReturnValue(START + GC_TIME - DRIFT)
		vi.advanceTimersByTime(GC_TIME)

		// Well past the deadline on both clocks: a missed eviction must not leave the entry
		// permanently alive with no timer left to retry it.
		wallClock.mockReturnValue(START + GC_TIME * 10)
		vi.advanceTimersByTime(GC_TIME * 10)

		expect(cache.getInstance(id)).toBeUndefined()
		expect(cache.keys()).toEqual([])
	})
})
