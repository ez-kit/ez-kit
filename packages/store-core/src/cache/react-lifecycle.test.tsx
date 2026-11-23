import { act, render, screen } from '@testing-library/react'
import { StrictMode, Suspense, useEffect, useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { attachCapability } from '../capability'
import { ServicesProvider } from '../react'
import { createServiceRegistry, serviceKey } from '../service'

import { createCacheReact } from './create-cache-react'

type Value = { label: string }

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})

describe('committed cache ownership', () => {
	it.each([0, 1001])('discards abandoned Suspense defaults and services after %i ms', async (delay) => {
		const token = serviceKey<string>('cache-lifecycle.token')
		const api = createCacheReact<Value>({ useRead: (instance, selector) => selector(instance) }, { gcTime: 1000 })
		const setup = vi.fn()
		const group = api.createCachedStore<Value>(
			({ defaultValue }) => {
				const instance = { ...defaultValue }
				attachCapability(instance, {
					name: 'probe',
					setup(value, context) {
						setup(value, context.services.get(token))
						return undefined
					},
				})
				return instance
			},
			{ name: 'panel' },
		)
		let suspended = true
		const forever = new Promise<never>(() => undefined)
		function Content() {
			const instance = group.useInstance()
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense uses thrown promises.
			if (suspended) throw forever
			return <span data-testid='value'>{instance.label}</span>
		}
		const oldServices = createServiceRegistry([[token, 'old-service']])
		const newServices = createServiceRegistry([[token, 'new-service']])
		function Tree({ current, visible }: { current: boolean; visible: boolean }) {
			return (
				<api.Provider>
					<ServicesProvider registry={current ? newServices : oldServices}>
						<Suspense fallback={<span>loading</span>}>
							{visible ? (
								<group.Provider
									id='one'
									defaultValue={{ label: current ? 'current' : 'abandoned' }}
								>
									<Content />
								</group.Provider>
							) : null}
						</Suspense>
					</ServicesProvider>
				</api.Provider>
			)
		}
		const view = render(
			<Tree
				current={false}
				visible
			/>,
		)
		expect(setup).not.toHaveBeenCalled()
		expect(group.getFromCache({ id: 'one' })).toBeUndefined()
		view.rerender(
			<Tree
				current
				visible={false}
			/>,
		)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(delay)
		})
		suspended = false
		view.rerender(
			<Tree
				current
				visible
			/>,
		)
		expect(screen.getByTestId('value')).toHaveTextContent('current')
		expect(setup).toHaveBeenCalledExactlyOnceWith({ label: 'current' }, 'new-service')
	})

	it('converges simultaneous owners on one committed instance and retains it until the last observer leaves', async () => {
		const setup = vi.fn(() => cleanup)
		const cleanup = vi.fn()
		const api = createCacheReact<Value>({ useRead: (instance, selector) => selector(instance) }, { gcTime: 10 })
		const group = api.createCachedStore<Value>(
			({ defaultValue }) => {
				const instance = { ...defaultValue }
				attachCapability(instance, { name: 'probe', setup })
				return instance
			},
			{ name: 'panel' },
		)
		const sharedDefaults = { label: 'first' }
		const seen = new Map<string, Value>()
		function Content({ name }: { name: string }) {
			const instance = group.useInstance()
			useLayoutEffect(() => {
				seen.set(name, instance)
			}, [instance, name])
			return <span data-testid={name}>{instance.label}</span>
		}
		function Tree({ first, second }: { first: boolean; second: boolean }) {
			return (
				<StrictMode>
					<api.Provider>
						{first ? (
							<group.Provider
								id='one'
								defaultValue={sharedDefaults}
							>
								<Content name='first' />
							</group.Provider>
						) : null}
						{second ? (
							<group.Provider
								id='one'
								defaultValue={sharedDefaults}
							>
								<Content name='second' />
							</group.Provider>
						) : null}
					</api.Provider>
				</StrictMode>
			)
		}
		const view = render(
			<Tree
				first
				second
			/>,
		)
		expect(seen.get('first')).toBe(seen.get('second'))
		expect(screen.getByTestId('first')).toHaveTextContent('first')
		expect(screen.getByTestId('second')).toHaveTextContent('first')
		expect(setup).toHaveBeenCalledTimes(1)
		view.rerender(
			<Tree
				first={false}
				second
			/>,
		)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(20)
		})
		expect(cleanup).not.toHaveBeenCalled()
		expect(group.getFromCache({ id: 'one' })).toBe(seen.get('second'))
		view.rerender(
			<Tree
				first={false}
				second={false}
			/>,
		)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(20)
		})
		expect(cleanup).toHaveBeenCalledTimes(1)
	})
	it.each(['layout', 'passive'] as const)(
		'shares one raw instance before descendant %s effects initialize compatible cold owners',
		(kind) => {
			const api = createCacheReact<{ count: number }>({ useRead: (instance, selector) => selector(instance) })
			const group = api.createCachedStore(() => ({ count: 0 }), { name: 'counter' })
			const captured: { count: number }[] = []
			const useMount = kind === 'layout' ? useLayoutEffect : useEffect
			function Content({ step }: { step: number }) {
				const instance = group.useInstance()
				useMount(() => {
					captured.push(instance)
					instance.count += step
					// Initialization belongs to this logical mount, rather than a later identity correction.
				}, [])
				return null
			}
			render(
				<api.Provider>
					<group.Provider id='one'>
						<Content step={1} />
					</group.Provider>
					<group.Provider id='one'>
						<Content step={10} />
					</group.Provider>
				</api.Provider>,
			)
			expect(captured[0]).toBe(captured[1])
			expect(group.getFromCache({ id: 'one' })?.count).toBe(11)
		},
	)

	it('diagnoses conflicting cold initialization and releases its committed subscriptions on cleanup', () => {
		const api = createCacheReact<Value>({ useRead: (instance, selector) => selector(instance) }, { gcTime: 0 })
		const active = new Set<Value>()
		const group = api.createCachedStore<Value>(
			({ defaultValue }) => {
				const instance = { ...defaultValue }
				attachCapability(instance, {
					name: 'probe',
					setup(value) {
						active.add(value)
						return () => {
							active.delete(value)
						}
					},
				})
				return instance
			},
			{ name: 'panel' },
		)
		const effects = vi.fn()
		function Content() {
			useLayoutEffect(effects, [])
			return null
		}
		expect(() =>
			render(
				<api.Provider>
					<group.Provider
						id='one'
						defaultValue={{ label: 'first' }}
					>
						<Content />
					</group.Provider>
					<group.Provider
						id='one'
						defaultValue={{ label: 'second' }}
					>
						<Content />
					</group.Provider>
				</api.Provider>,
			),
		).toThrow(/Concurrent.*defaultValue/)
		act(() => {
			vi.runOnlyPendingTimers()
		})
		expect(active.size).toBe(0)
		expect(group.getFromCache({ id: 'one' })).toBeUndefined()
	})
	it('shares compatible cold instances with different gcTime while retaining the first activation lifetime', () => {
		const api = createCacheReact<Value>({ useRead: (instance, selector) => selector(instance) })
		const group = api.createCachedStore(() => ({ label: 'shared' }), { name: 'panel' })
		const seen: Value[] = []
		function Content() {
			const instance = group.useInstance()
			useLayoutEffect(() => {
				seen.push(instance)
			}, [instance])
			return null
		}
		function Tree({ first, second }: { first: boolean; second: boolean }) {
			return (
				<api.Provider>
					{first ? (
						<group.Provider
							id='one'
							gcTime={1000}
						>
							<Content />
						</group.Provider>
					) : null}
					{second ? (
						<group.Provider
							id='one'
							gcTime={60000}
						>
							<Content />
						</group.Provider>
					) : null}
				</api.Provider>
			)
		}
		const view = render(
			<Tree
				first
				second
			/>,
		)
		expect(seen[0]).toBe(seen[1])
		view.rerender(
			<Tree
				first={false}
				second
			/>,
		)
		view.rerender(
			<Tree
				first={false}
				second={false}
			/>,
		)
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		expect(group.getFromCache({ id: 'one' })).toBeUndefined()
	})
})
