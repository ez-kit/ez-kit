import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachCapability } from '../capability'
import { createServiceRegistry } from '../service'

import { createInstanceCache } from './instance-cache'

import type { InstanceCache } from './instance-cache'
import type { PluginCleanup } from '../plugin'
import type { StoreId } from '../store-id'

function aggregateOf(run: () => void): AggregateError {
	try {
		run()
	} catch (error) {
		expect(error).toBeInstanceOf(AggregateError)
		return error as AggregateError
	}
	throw new Error('Expected an observable cleanup failure')
}

function add(cache: InstanceCache, id: StoreId, cleanups: PluginCleanup[], gcTime = 1) {
	const instance = {}
	for (const [index, cleanup] of cleanups.entries()) {
		attachCapability(instance, { name: String(index), setup: () => cleanup })
	}
	cache.getOrCreate(id, () => instance, {
		gcTime,
		context: { services: createServiceRegistry(), id, isServer: false },
	})
	cache.addObserver(id)
	cache.removeObserver(id)
	return instance
}

const id: StoreId = { path: ['page'], name: 'panel', id: 'one' }

afterEach(() => {
	vi.useRealTimers()
})

describe('cached plugin teardown', () => {
	it('runs cleanups in reverse attachment order, including undefined cleanups', () => {
		const cache = createInstanceCache()
		const order: string[] = []
		add(cache, id, [
			() => {
				order.push('transport')
			},
			undefined,
			() => {
				order.push('subscription')
			},
		])
		cache.remove(id)
		expect(order).toEqual(['subscription', 'transport'])
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('runs every cleanup and releases an entry before remove throws all failures', () => {
		const cache = createInstanceCache()
		const first = new Error('first')
		const last = new Error('last')
		const middle = vi.fn()
		add(cache, id, [
			() => {
				throw first
			},
			middle,
			() => {
				throw last
			},
		])
		const error = aggregateOf(() => {
			cache.remove(id)
		})
		expect(error.errors).toEqual([last, first])
		expect(middle).toHaveBeenCalledOnce()
		expect(cache.keys()).toEqual([])
		expect(cache.getInstance(id)).toBeUndefined()
		expect(() => {
			cache.remove(id)
		}).not.toThrow()
		expect(middle).toHaveBeenCalledOnce()
		const replacement = cache.getOrCreate(id, () => ({ fresh: true }), {
			gcTime: 1,
			context: { services: createServiceRegistry(), id, isServer: false },
		})
		expect(replacement.fresh).toBe(true)
	})

	it('releases every matching entry before clear reports errors and preserves other scopes', () => {
		const cache = createInstanceCache()
		const errors = [new Error('one'), new Error('two')] as const
		const healthy = vi.fn()
		add(cache, id, [
			() => {
				throw errors[0]
			},
		])
		const second = { ...id, id: 'two' }
		add(cache, second, [
			healthy,
			() => {
				throw errors[1]
			},
		])
		const outside = { ...id, path: ['other'] }
		const retained = add(cache, outside, [vi.fn()])
		const error = aggregateOf(() => {
			cache.clear(['page'])
		})
		expect(error.errors).toEqual(errors)
		expect(healthy).toHaveBeenCalledOnce()
		expect(cache.getInstance(id)).toBeUndefined()
		expect(cache.getInstance(second)).toBeUndefined()
		expect(cache.getInstance(outside)).toBe(retained)
		expect(cache.keys()).toEqual([outside])
	})

	it('completes GC eviction and remaining cleanups before the timer surfaces its aggregate error', () => {
		vi.useFakeTimers()
		const cache = createInstanceCache()
		const failure = new Error('unsubscribe failed')
		const healthy = vi.fn()
		add(cache, id, [
			healthy,
			() => {
				throw failure
			},
		])
		cache.removeObserver(id)
		const error = aggregateOf(() => {
			vi.advanceTimersByTime(1)
		})
		expect(error.errors).toEqual([failure])
		expect(healthy).toHaveBeenCalledOnce()
		expect(cache.getInstance(id)).toBeUndefined()
		expect(cache.getKeysSnapshot()).toEqual([])
		expect(() => {
			vi.advanceTimersByTime(1000)
		}).not.toThrow()
		expect(healthy).toHaveBeenCalledOnce()
	})

	it('preserves a newer lifetime created by a reentrant cleanup', () => {
		const cache = createInstanceCache()
		let replacement: object | undefined
		add(cache, id, [
			() => {
				cache.remove(id)
				replacement = add(cache, id, [])
			},
		])
		cache.remove(id)
		expect(replacement).toBeDefined()
		expect(cache.getInstance(id)).toBe(replacement)
	})

	it('releases earlier successful plugin setups in reverse order if activation later fails', () => {
		const cache = createInstanceCache()
		const instance = {}
		const order: string[] = []
		const failure = new Error('setup failed')
		for (const name of ['first', 'second']) {
			attachCapability(instance, {
				name,
				setup: () => () => {
					order.push(name)
				},
			})
		}
		attachCapability(instance, {
			name: 'failed',
			setup: () => {
				throw failure
			},
		})
		expect(() =>
			cache.getOrCreate(id, () => instance, {
				gcTime: 1,
				context: { services: createServiceRegistry(), id, isServer: false },
			}),
		).toThrow(failure)
		expect(order).toEqual(['second', 'first'])
		expect(cache.keys()).toEqual([])
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('preserves setup failure and every rollback failure when activation and teardown both fail', () => {
		const cache = createInstanceCache()
		const instance = {}
		const setupFailure = new Error('setup failed')
		const cleanupFailure = new Error('cleanup failed')
		const healthy = vi.fn()
		attachCapability(instance, { name: 'first', setup: () => healthy })
		attachCapability(instance, {
			name: 'second',
			setup: () => () => {
				throw cleanupFailure
			},
		})
		attachCapability(instance, {
			name: 'failed',
			setup: () => {
				throw setupFailure
			},
		})
		const error = aggregateOf(() =>
			cache.getOrCreate(id, () => instance, {
				gcTime: 1,
				context: { services: createServiceRegistry(), id, isServer: false },
			}),
		)
		expect(error.errors).toEqual([setupFailure, cleanupFailure])
		expect(healthy).toHaveBeenCalledOnce()
		expect(cache.keys()).toEqual([])
	})
})

it('rolls back setup when a capability disposes the cache before publication', () => {
	const cache = createInstanceCache()
	const store = {}
	const cleanup = vi.fn()
	attachCapability(store, {
		name: 'dispose-owner',
		setup() {
			cache.dispose()
			return cleanup
		},
	})
	expect(() =>
		cache.getOrCreate(id, () => store, {
			gcTime: Infinity,
			context: { id, services: createServiceRegistry(), isServer: false },
		}),
	).toThrow('disposed store cache')
	expect(cleanup).toHaveBeenCalledOnce()
	expect(cache.addObserver(id)).toBeUndefined()
	expect(cache.getInstance(id)).toBeUndefined()
	expect(cache.keys()).toEqual([])
})

it('rejects recursive creation, rolls back earlier setup and releases the reservation', () => {
	const cache = createInstanceCache()
	const options = { gcTime: Infinity, context: { id, services: createServiceRegistry(), isServer: false } }
	const cleanup = vi.fn()
	const nestedFactory = vi.fn(() => ({}))
	const store = {}
	attachCapability(store, { name: 'resource', setup: () => cleanup })
	attachCapability(store, {
		name: 'recursive',
		setup() {
			cache.getOrCreate(id, nestedFactory, options)
		},
	})
	expect(() => cache.getOrCreate(id, () => store, options)).toThrow('same store cache entry recursively')
	expect(cleanup).toHaveBeenCalledOnce()
	expect(nestedFactory).not.toHaveBeenCalled()
	expect(cache.keys()).toEqual([])
	const replacement = {}
	expect(cache.getOrCreate(id, () => replacement, options)).toBe(replacement)
	cache.dispose()
})
