import { act, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachCapability } from '../capability'

import { createCacheReact } from './create-cache-react'
afterEach(() => vi.useRealTimers())
function fixture(gcTime = Infinity) {
	const api = createCacheReact<{ count: number }>({ useRead: (instance, select) => select(instance) }, { gcTime })
	const active = new Set<object>()
	const setup = vi.fn((instance: object) => {
		active.add(instance)
	})
	const cleanup = vi.fn((instance: object) => {
		active.delete(instance)
	})
	const group = api.createCachedStore(
		() => {
			const value = { count: 0 }
			attachCapability(value, {
				name: 'tracked',
				setup(instance) {
					setup(instance)
					return () => {
						cleanup(instance)
					}
				},
			})
			return value
		},
		{ name: 'panel' },
	)
	return { api, group, active, setup, cleanup }
}
describe('cache container committed lifetime', () => {
	it.each([Infinity, 5000])('releases entries when the whole container ends at gcTime %s', (gcTime) => {
		vi.useFakeTimers()
		const { api, group, active, cleanup } = fixture(gcTime)
		const view = render(
			<api.Provider>
				<group.Provider id='one' />
				<group.Provider id='two' />
			</api.Provider>,
		)
		expect(active.size).toBe(2)
		view.unmount()
		expect(active.size).toBe(0)
		expect(cleanup).toHaveBeenCalledTimes(2)
		act(() => {
			vi.runOnlyPendingTimers()
		})
		expect(cleanup).toHaveBeenCalledTimes(2)
	})
	it('retains StrictMode synthetic disconnects but releases actual unmount', () => {
		const { api, group, active, setup, cleanup } = fixture()
		const view = render(
			<StrictMode>
				<api.Provider>
					<group.Provider id='one' />
				</api.Provider>
			</StrictMode>,
		)
		expect(active.size).toBe(1)
		expect(setup).toHaveBeenCalledOnce()
		expect(cleanup).not.toHaveBeenCalled()
		const instance = group.getFromCache({ id: 'one' })
		view.rerender(
			<StrictMode>
				<api.Provider>
					<group.Provider id='one' />
				</api.Provider>
			</StrictMode>,
		)
		expect(group.getFromCache({ id: 'one' })).toBe(instance)
		expect(setup).toHaveBeenCalledOnce()
		view.unmount()
		expect(active.size).toBe(0)
		expect(cleanup).toHaveBeenCalledOnce()
	})
	it('releases the old container before same-commit replacement setup takes its resource', () => {
		const api = createCacheReact<object>({ useRead: (instance, select) => select(instance) }, { gcTime: Infinity })
		let owner: object | undefined
		const group = api.createCachedStore(
			() => {
				const value = {}
				attachCapability(value, {
					name: 'exclusive',
					setup(instance) {
						if (owner !== undefined) throw new Error('Address collision')
						owner = instance
						return () => {
							owner = undefined
						}
					},
				})
				return value
			},
			{ name: 'exclusive' },
		)
		const tree = (key: string) => (
			<api.Provider key={key}>
				<group.Provider id='one' />
			</api.Provider>
		)
		const view = render(tree('first'))
		const first = owner
		expect(first).toBeDefined()
		expect(() => {
			view.rerender(tree('second'))
		}).not.toThrow()
		expect(owner).toBeDefined()
		expect(owner).not.toBe(first)
		view.unmount()
		expect(owner).toBeUndefined()
	})
	it('does not dispose another mounted container of the same factory', () => {
		const { api, group, active, cleanup } = fixture()
		function Tree({ first }: { first: boolean }) {
			return (
				<>
					{first ? (
						<api.Provider>
							<group.Provider id='one' />
						</api.Provider>
					) : null}
					<api.Provider>
						<group.Provider id='one' />
					</api.Provider>
				</>
			)
		}
		const view = render(<Tree first />)
		expect(active.size).toBe(2)
		view.rerender(<Tree first={false} />)
		expect(active.size).toBe(1)
		expect(cleanup).toHaveBeenCalledOnce()
		view.unmount()
		expect(active.size).toBe(0)
		expect(cleanup).toHaveBeenCalledTimes(2)
	})
	it('finishes every container resource before propagating cleanup failures', () => {
		const api = createCacheReact<object>({ useRead: (instance, select) => select(instance) }, { gcTime: Infinity })
		const active = new Set<object>()
		const failure = new Error('release failed')
		const group = api.createCachedStore(
			() => {
				const value = {}
				attachCapability(value, {
					name: 'tracked',
					setup(instance) {
						active.add(instance)
						return () => {
							active.delete(instance)
							throw failure
						}
					},
				})
				return value
			},
			{ name: 'error' },
		)
		const view = render(
			<api.Provider>
				<group.Provider id='one' />
				<group.Provider id='two' />
			</api.Provider>,
		)
		expect(active.size).toBe(2)
		expect(() => {
			view.unmount()
		}).toThrow(AggregateError)
		expect(active.size).toBe(0)
		expect(group.getFromCache({ id: 'one' })).toBeUndefined()
	})
})
