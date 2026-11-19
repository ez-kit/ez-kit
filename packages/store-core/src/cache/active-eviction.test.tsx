import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachCapability } from '../capability'
import { createServiceRegistry } from '../service'

import { createCacheReact } from './create-cache-react'
import { createInstanceCache } from './instance-cache'

import type { InstanceCache } from './instance-cache'
import type { StoreId } from '../store-id'

const id: StoreId = { path: ['page'], name: 'panel', id: 'one' }
function add(cache: InstanceCache, target = id, cleanup = vi.fn(), gcTime = Infinity) {
	const instance = { count: 0 }
	attachCapability(instance, { name: 'tracked', setup: () => cleanup })
	cache.getOrCreate(target, () => instance, {
		gcTime,
		context: { services: createServiceRegistry(), id: target, isServer: false },
	})
	cache.addObserver(target)
	return { instance, cleanup }
}
afterEach(() => vi.useRealTimers())

describe('explicit eviction with active owners', () => {
	it.each([0, 5000, Infinity])('defers remove until the last observer leaves at gcTime %s', (gcTime) => {
		vi.useFakeTimers()
		const cache = createInstanceCache()
		const { instance, cleanup } = add(cache, id, vi.fn(), gcTime)
		cache.addObserver(id)
		cache.remove(id)
		expect(cache.getInstance(id)).toBe(instance)
		expect(cleanup).not.toHaveBeenCalled()
		cache.removeObserver(id, instance)
		vi.runOnlyPendingTimers()
		expect(cache.getInstance(id)).toBe(instance)
		cache.removeObserver(id, instance)
		expect(cleanup).not.toHaveBeenCalled()
		vi.advanceTimersByTime(0)
		expect(cleanup).toHaveBeenCalledOnce()
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('preserves removal intent across an observer reconnect that cancels its idle timer', () => {
		vi.useFakeTimers()
		const cache = createInstanceCache()
		const { instance, cleanup } = add(cache)
		cache.remove(id)
		cache.removeObserver(id, instance)
		cache.addObserver(id)
		vi.runOnlyPendingTimers()
		expect(cache.getInstance(id)).toBe(instance)
		expect(cleanup).not.toHaveBeenCalled()
		cache.removeObserver(id, instance)
		vi.runOnlyPendingTimers()
		expect(cleanup).toHaveBeenCalledOnce()
		expect(cache.getInstance(id)).toBeUndefined()
	})

	it('clears idle entries despite errors while retaining matching active owners and other scopes', () => {
		vi.useFakeTimers()
		const cache = createInstanceCache()
		const active = add(cache)
		const failure = new Error('idle cleanup')
		const idleId = { ...id, id: 'idle' }
		const idle = add(
			cache,
			idleId,
			vi.fn(() => {
				throw failure
			}),
		)
		cache.removeObserver(idleId, idle.instance)
		const outsideId = { ...id, path: ['outside'] }
		const outside = add(cache, outsideId)
		expect(() => {
			cache.clear(['page'])
		}).toThrow(AggregateError)
		expect(idle.cleanup).toHaveBeenCalledOnce()
		expect(cache.getInstance(idleId)).toBeUndefined()
		expect(cache.getInstance(id)).toBe(active.instance)
		expect(cache.getInstance(outsideId)).toBe(outside.instance)
		expect(active.cleanup).not.toHaveBeenCalled()
		cache.removeObserver(id, active.instance)
		vi.runOnlyPendingTimers()
		expect(active.cleanup).toHaveBeenCalledOnce()
		expect(outside.cleanup).not.toHaveBeenCalled()
		cache.dispose()
	})

	it('container disposal force-releases active owners and prevents resurrection during cleanup', () => {
		const cache = createInstanceCache()
		const replacement = vi.fn()
		const first = add(
			cache,
			id,
			vi.fn(() => {
				cache.getOrCreate(id, replacement, {
					gcTime: Infinity,
					context: { services: createServiceRegistry(), id, isServer: false },
				})
			}),
		)
		const secondId = { ...id, id: 'second' }
		const second = add(cache, secondId)
		cache.remove(id)
		expect(() => {
			cache.dispose()
		}).toThrow(AggregateError)
		expect(first.cleanup).toHaveBeenCalledOnce()
		expect(second.cleanup).toHaveBeenCalledOnce()
		expect(replacement).not.toHaveBeenCalled()
		expect(cache.keys()).toEqual([])
		expect(() => {
			cache.dispose()
		}).not.toThrow()
		expect(() => {
			cache.addObserver(id, {
				instance: {},
				gcTime: Infinity,
				context: { services: createServiceRegistry(), id, isServer: false },
			})
		}).toThrow('disposed')
	})

	it('retains mounted React owners and passive readers until the last Provider leaves', () => {
		vi.useFakeTimers()
		const cleanup = vi.fn()
		const setup = vi.fn(() => cleanup)
		const api = createCacheReact<{ count: number }>(
			{ useRead: (instance, select) => select(instance) },
			{ gcTime: Infinity },
		)
		const group = api.createCachedStore(
			() => {
				const instance = { count: 0 }
				attachCapability(instance, { name: 'tracked', setup })
				return instance
			},
			{ name: 'panel' },
		)
		let captured: object | undefined
		function Owner() {
			captured = group.useInstance()
			return null
		}
		function Reader() {
			const count = group.useFromCache({ id: 'one' }, (value) => (value as { count: number } | undefined)?.count)
			return <output>{count === undefined ? 'absent' : String(count)}</output>
		}
		function Tree({ owners }: { owners: number }) {
			return (
				<api.Provider>
					{Array.from({ length: owners }, (_, index) => (
						<group.Provider
							key={index}
							id='one'
						>
							<Owner />
						</group.Provider>
					))}
					<Reader />
				</api.Provider>
			)
		}
		const view = render(<Tree owners={2} />)
		const original = captured
		expect(screen.getByText('0')).toBeDefined()
		act(() => {
			group.remove({ id: 'one' })
		})
		expect(group.getFromCache({ id: 'one' })).toBe(original)
		expect(setup).toHaveBeenCalledOnce()
		expect(cleanup).not.toHaveBeenCalled()
		view.rerender(<Tree owners={1} />)
		act(() => {
			vi.runOnlyPendingTimers()
		})
		expect(captured).toBe(original)
		expect(screen.getByText('0')).toBeDefined()
		view.rerender(<Tree owners={0} />)
		act(() => {
			vi.runOnlyPendingTimers()
		})
		expect(cleanup).toHaveBeenCalledOnce()
		expect(screen.getByText('absent')).toBeDefined()
		view.unmount()
	})
})
