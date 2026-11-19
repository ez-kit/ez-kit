import { act, render, renderHook, waitFor } from '@testing-library/react'
import {
	BrowserRouter,
	MemoryRouter,
	createMemoryRouter,
	RouterContextProvider,
	RouterProvider,
	useBlocker,
	useLocation,
} from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SourceMutationCancelledError } from '../source-errors'

import { reactRouterAdapter } from './react-router'
import { acknowledgeNavigation } from './react-router-navigation'

import type { SyncReadSourcePort } from '../types'
import type { ObservableRouter } from './react-router-navigation'
import type { ReactNode } from 'react'

const context = { fields: [], diff: { set: ['q'], removed: [] }, meta: {} }
const states = [
	{ label: 'string', state: 'return-to-list' },
	{ label: 'array', state: ['selected', 42] },
	{ label: 'null', state: null },
	{ label: 'object', state: { selected: 'tab', nested: [1, 2] } },
	{ label: 'date', state: new Date(1000) },
]

afterEach(() => {
	window.history.replaceState(null, '', '/')
})

describe('React Router application state and navigation identity', () => {
	it.each(states)('preserves exact $label state in basic routers', ({ state }) => {
		function Wrapper({ children }: { children: ReactNode }) {
			return <MemoryRouter initialEntries={[{ pathname: '/page', search: '?q=old', state }]}>{children}</MemoryRouter>
		}
		const view = renderHook(() => ({ adapter: reactRouterAdapter.usePort(), location: useLocation() }), {
			wrapper: Wrapper,
		})
		const notify = vi.fn()
		const unsubscribe = view.result.current.adapter.port.subscribe?.(notify)
		act(() => {
			void view.result.current.adapter.port.set(new Map([['q', 'new']]), context)
		})
		expect(view.result.current.location.state).toBe(state)
		expect(view.result.current.location.search).toBe('?q=new')
		expect(notify).not.toHaveBeenCalled()
		unsubscribe?.()
		view.unmount()
	})

	it.each(states)('preserves $label state in BrowserRouter', ({ state }) => {
		window.history.replaceState({ usr: state, key: 'initial', idx: 0 }, '', '/page?q=old')
		const view = renderHook(() => ({ adapter: reactRouterAdapter.usePort(), location: useLocation() }), {
			wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
		})
		const notify = vi.fn()
		const unsubscribe = view.result.current.adapter.port.subscribe?.(notify)
		act(() => {
			void view.result.current.adapter.port.set(new Map([['q', 'new']]), context)
		})
		expect(view.result.current.location.state).toEqual(state)
		expect(view.result.current.location.search).toBe('?q=new')
		expect(notify).not.toHaveBeenCalled()
		unsubscribe?.()
		view.unmount()
	})

	it.each(states)('preserves exact $label state in data routers', async ({ state }) => {
		let port: SyncReadSourcePort | undefined
		function View() {
			port = reactRouterAdapter.usePort().port
			return null
		}
		const router = createMemoryRouter([{ path: '/page', element: <View /> }], {
			initialEntries: [{ pathname: '/page', search: '?q=old', state }],
		})
		const view = render(<RouterProvider router={router} />)
		await waitFor(() => {
			expect(port).toBeDefined()
		})
		if (!port) throw new Error('Missing URL port')
		const active = port
		const notify = vi.fn()
		const unsubscribe = active.subscribe?.(notify)
		let result: Promise<void> = Promise.resolve()
		await act(async () => {
			result = Promise.resolve(active.set(new Map([['q', 'new']]), context))
			await Promise.resolve()
		})
		await result
		expect(router.state.location.state).toBe(state)
		expect(router.state.location.search).toBe('?q=new')
		expect(notify).not.toHaveBeenCalled()
		unsubscribe?.()
		view.unmount()
		router.dispose()
	})

	it('rejects an external data navigation to the identical pending query instead of acknowledging it', async () => {
		let port: SyncReadSourcePort | undefined
		let release!: () => void
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		let reads = 0
		function View() {
			port = reactRouterAdapter.usePort().port
			return null
		}
		const router = createMemoryRouter(
			[
				{
					path: '/page',
					element: <View />,
					loader: ({ request }) => {
						if (new URL(request.url).searchParams.get('q') !== 'same') return null
						reads += 1
						return reads === 1 ? gate : null
					},
				},
			],
			{ initialEntries: ['/page?q=old'] },
		)
		const view = render(<RouterProvider router={router} />)
		await waitFor(() => {
			expect(port).toBeDefined()
		})
		if (!port) throw new Error('Missing URL port')
		const active = port
		const notify = vi.fn()
		const unsubscribe = active.subscribe?.(notify)
		let result: Promise<unknown> = Promise.resolve()
		await act(async () => {
			result = Promise.resolve(active.set(new Map([['q', 'same']]), context)).then(
				() => null,
				(error: unknown) => error,
			)
			void router.navigate('/page?q=same', { state: 'external' })
			await Promise.resolve()
		})
		expect(await result).toBeInstanceOf(SourceMutationCancelledError)
		expect(router.state.location.state).toBe('external')
		expect(notify).toHaveBeenCalledOnce()
		release()
		unsubscribe?.()
		view.unmount()
		router.dispose()
	})

	it('preserves application state through blocker proceed without confusing the new dispatch key', async () => {
		const state = ['selected', 42]
		let port: SyncReadSourcePort | undefined
		let blocker: ReturnType<typeof useBlocker> | undefined
		function View() {
			port = reactRouterAdapter.usePort().port
			blocker = useBlocker(true)
			return null
		}
		const router = createMemoryRouter([{ path: '/page', element: <View /> }], {
			initialEntries: [{ pathname: '/page', search: '?q=old', state }],
		})
		const view = render(<RouterProvider router={router} />)
		await waitFor(() => {
			expect(port).toBeDefined()
		})
		if (!port) throw new Error('Missing URL port')
		const active = port
		const notify = vi.fn()
		const unsubscribe = active.subscribe?.(notify)
		let result: Promise<void> = Promise.resolve()
		await act(async () => {
			result = Promise.resolve(active.set(new Map([['q', 'new']]), context))
			await Promise.resolve()
		})
		expect(blocker?.state).toBe('blocked')
		expect(blocker?.location?.state).toBe(state)
		await act(async () => {
			blocker?.proceed?.()
			await Promise.resolve()
		})
		await result
		expect(router.state.location.state).toBe(state)
		expect(router.state.location.search).toBe('?q=new')
		expect(notify).not.toHaveBeenCalled()
		unsubscribe?.()
		view.unmount()
		router.dispose()
	})

	it('rejects delayed real router context publication without claiming a late write was cancelled', async () => {
		let port: SyncReadSourcePort | undefined
		let delayed = false
		let release!: () => void
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		function View() {
			port = reactRouterAdapter.usePort().port
			return null
		}
		const state = 'return-to-list'
		const router = createMemoryRouter([{ path: '/page', element: <View />, loader: () => null }], {
			initialEntries: [{ pathname: '/page', search: '?q=old', state }],
			getContext: () => (delayed ? gate.then(() => new RouterContextProvider()) : new RouterContextProvider()),
		})
		const view = render(<RouterProvider router={router} />)
		await waitFor(() => {
			expect(port).toBeDefined()
		})
		if (!port) throw new Error('Missing URL port')
		const active = port
		delayed = true
		let result: Promise<unknown> = Promise.resolve()
		await act(async () => {
			result = Promise.resolve(active.set(new Map([['q', 'new']]), context)).then(
				() => null,
				(error: unknown) => error,
			)
			await Promise.resolve()
		})
		const error = await result
		expect(String(error)).toContain('synchronously observable location keys')
		expect(error).not.toBeInstanceOf(SourceMutationCancelledError)
		expect(router.state.location.search).toBe('?q=old')
		await act(async () => {
			release()
			await Promise.resolve()
		})
		await waitFor(() => {
			expect(router.state.location.search).toBe('?q=new')
		})
		expect(router.state.location.state).toBe(state)
		view.unmount()
		router.dispose()
	})

	it('diagnoses delayed key publication as uncertain instead of signalling proven cancellation', async () => {
		const listeners = new Set<() => void>()
		const initial = { key: 'old', pathname: '/page', search: '?q=old', hash: '', state: null }
		let release!: () => void
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const router: ObservableRouter = {
			basename: '/',
			state: { location: initial, navigation: { state: 'idle' }, blockers: new Map() },
			subscribe(listener) {
				listeners.add(listener)
				return () => {
					listeners.delete(listener)
				}
			},
			async navigate(target, options) {
				const state = options.state
				await gate
				this.state.location = { ...target, key: 'late', state }
				for (const listener of listeners) listener()
			},
		}
		const own = vi.fn()
		const result = acknowledgeNavigation(
			router,
			{ pathname: '/page', search: '?q=new', hash: '' },
			{ replace: true, state: null },
			own,
			{ get: () => router.state.location, subscribe: () => () => undefined },
		).catch((error: unknown) => error)
		const error = await result
		expect(error).toBeInstanceOf(Error)
		expect(error).not.toBeInstanceOf(SourceMutationCancelledError)
		expect(String(error)).toContain('synchronously observable location keys')
		expect(own).not.toHaveBeenCalled()
		expect(listeners.size).toBe(0)
		release()
		await Promise.resolve()
		expect(router.state.location.key).toBe('late')
	})
})
