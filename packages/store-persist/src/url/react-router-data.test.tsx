import { act, render, screen, waitFor } from '@testing-library/react'
import { startTransition, Suspense } from 'react'
import { createMemoryRouter, redirect, RouterProvider, useBlocker, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from '../binding'
import { paramNumber, paramString } from '../codecs'
import { createPersistEngine } from '../engine'
import { objectPort, observable } from '../test-kit'

import { reactRouterAdapter } from './react-router'
import { observableRouter } from './react-router-navigation'

import type { SyncReadSourcePort } from '../types'
import type { LoaderFunction } from 'react-router'

const context = { fields: [], diff: { set: ['q'], removed: [] }, meta: {} }
async function harness(block = true, loader?: LoaderFunction) {
	let port: SyncReadSourcePort | undefined
	let blocker: ReturnType<typeof useBlocker> | undefined
	function View() {
		port = reactRouterAdapter.usePort().port
		blocker = useBlocker(block)
		return null
	}
	const router = createMemoryRouter(
		[
			{ path: '/page', element: <View />, ...(loader ? { loader } : {}) },
			{ path: '/other', element: <View /> },
		],
		{ initialEntries: ['/page?q=initial'] },
	)
	const view = render(<RouterProvider router={router} />)
	await waitFor(() => {
		expect(port).toBeDefined()
	})
	if (!port) throw new Error('Missing URL port')
	return {
		port,
		router,
		reset: () => blocker?.reset?.(),
		proceed: () => blocker?.proceed?.(),
		blocked: () => blocker?.state,
		close: () => {
			view.unmount()
			router.dispose()
		},
	}
}

describe('data-router mutation acknowledgement', () => {
	it('rejects a cancelled blocker and removes its optimistic query without an unhandled rejection', async () => {
		const app = await harness()
		let result: Promise<void> = Promise.resolve()
		let settled = false
		await act(async () => {
			result = Promise.resolve(app.port.set(new Map([['q', 'cancelled']]), context))
			void result.then(
				() => {
					settled = true
				},
				() => {
					settled = true
				},
			)
			await Promise.resolve()
		})
		expect(app.blocked()).toBe('blocked')
		expect(settled).toBe(false)
		await act(async () => {
			app.reset()
			await Promise.resolve()
		})
		await expect(result).rejects.toThrow('cancelled or redirected')
		expect(app.router.state.location.search).toBe('?q=initial')
		expect(app.port.get().get('q')).toBe('initial')
		app.close()
	})

	it('waits for a blocker to proceed and for its committed location before acknowledging', async () => {
		const app = await harness()
		let result: Promise<void> = Promise.resolve()
		let settled = false
		await act(async () => {
			result = Promise.resolve(app.port.set(new Map([['q', 'accepted']]), context))
			void result.then(
				() => {
					settled = true
				},
				() => {
					settled = true
				},
			)
			await Promise.resolve()
		})
		expect(settled).toBe(false)
		await act(async () => {
			app.proceed()
			await Promise.resolve()
		})
		await result
		expect(app.router.state.location.search).toBe('?q=accepted')
		expect(app.port.get().get('q')).toBe('accepted')
		app.close()
	})

	it('rejects a redirected query command instead of acknowledging its uncommitted target', async () => {
		const app = await harness(false, ({ request }) => {
			if (new URL(request.url).searchParams.get('q') === 'redirect') return redirect('/other?from=loader')
			return null
		})
		let result: Promise<void> = Promise.resolve()
		await act(async () => {
			result = Promise.resolve(app.port.set(new Map([['q', 'redirect']]), context))
			void result.catch(() => undefined)
			await Promise.resolve()
		})
		await expect(result).rejects.toThrow(/redirected|unmounted/)
		expect(app.router.state.location.pathname).toBe('/other')
		app.close()
	})

	it('keeps an asynchronous loader write pending until the accepted location commits', async () => {
		let release: (() => void) | undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const app = await harness(false, ({ request }) =>
			new URL(request.url).searchParams.get('q') === 'loading' ? gate : null,
		)
		let result: Promise<void> = Promise.resolve()
		let settled = false
		await act(async () => {
			result = Promise.resolve(app.port.set(new Map([['q', 'loading']]), context))
			void result.then(
				() => {
					settled = true
				},
				() => {
					settled = true
				},
			)
			await Promise.resolve()
		})
		expect(app.router.state.navigation.state).toBe('loading')
		expect(settled).toBe(false)
		await act(async () => {
			release?.()
			await Promise.resolve()
		})
		await result
		expect(app.router.state.location.search).toBe('?q=loading')
		app.close()
	})

	it('does not acknowledge or reconcile a redirected location while its React screen is suspended', async () => {
		let port: SyncReadSourcePort | undefined
		let release: (() => void) | undefined
		let ready = false
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		function View() {
			port = reactRouterAdapter.usePort().port
			if (useLocation().pathname === '/other' && !ready) {
				// eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense probe.
				throw gate
			}
			return <span>router screen</span>
		}
		const element = <View />
		const router = createMemoryRouter(
			[
				{
					path: '/page',
					element,
					loader: ({ request }) =>
						new URL(request.url).searchParams.get('q') === 'redirect' ? redirect('/other?q=server') : null,
				},
				{ path: '/other', element },
			],
			{ initialEntries: ['/page?q=initial'] },
		)
		const view = render(
			<Suspense fallback='loading'>
				<RouterProvider router={router} />
			</Suspense>,
		)
		await screen.findByText('router screen')
		if (!port) throw new Error('Missing URL port')
		const active = port
		let result: Promise<void> = Promise.resolve()
		let settled = false
		await act(async () => {
			startTransition(() => {
				result = Promise.resolve(active.set(new Map([['q', 'redirect']]), context))
				void result.then(
					() => {
						settled = true
					},
					() => {
						settled = true
					},
				)
			})
			await Promise.resolve()
		})
		expect(router.state.location.pathname).toBe('/other')
		expect(settled).toBe(false)
		expect(active.get().get('q')).not.toBe('server')
		await act(async () => {
			ready = true
			release?.()
			await Promise.resolve()
		})
		await expect(result).rejects.toThrow(/redirected|unmounted/)
		view.unmount()
		router.dispose()
	})

	it('propagates a navigation rejection and rolls back only the failed journal entry', async () => {
		const app = await harness(false)
		const boom = new Error('navigation transport failed')
		vi.spyOn(app.router, 'navigate').mockRejectedValueOnce(boom)
		await expect(app.port.set(new Map([['q', 'failed']]), context)).rejects.toBe(boom)
		expect(app.port.get().get('q')).toBe('initial')
		app.close()
	})

	it('rejects the flush fence, restores authoritative store state and never retries a cancelled query on another edit', async () => {
		const app = await harness()
		const store = observable({ q: 'initial', page: 1 })
		const binding = createBinding(
			store,
			objectPort,
			[
				{ path: ['q'], parser: paramString() },
				{ path: ['page'], parser: paramNumber() },
			],
			{},
		)
		captureDefaults(binding)
		addressBinding(binding, { path: ['page'], name: 'filters', id: 'one' })
		const engine = createPersistEngine(app.port, { ssrSafe: true })
		engine.seed(binding)
		const disconnect = engine.connect(binding)
		const unsubscribe = app.port.subscribe?.(() => {
			engine.pullSource()
		})
		let flushed: Promise<void> = Promise.resolve()
		let settled = false
		await act(async () => {
			store.q = 'cancelled'
			flushed = engine.flush(binding)
			void flushed.then(
				() => {
					settled = true
				},
				() => {
					settled = true
				},
			)
			await Promise.resolve()
		})
		expect(app.blocked()).toBe('blocked')
		expect(settled).toBe(false)
		await act(async () => {
			app.reset()
			await Promise.resolve()
		})
		await expect(flushed).rejects.toThrow('cancelled or redirected')
		expect(store.q).toBe('initial')
		expect(binding.status.dirty).toBe(false)
		await act(async () => {
			store.page = 2
			flushed = engine.flush(binding)
			void flushed.catch(() => undefined)
			await Promise.resolve()
		})
		expect(app.blocked()).toBe('blocked')
		await act(async () => {
			app.proceed()
			await Promise.resolve()
		})
		await flushed
		expect(app.router.state.location.search).toBe('?q=initial&page=2')
		expect(store.q).toBe('initial')
		unsubscribe?.()
		disconnect()
		engine.dispose()
		app.close()
	})

	it('diagnoses unsupported data-router observation instead of promising cancellation support', () => {
		expect(() => observableRouter(null, { location: {} })).toThrow('acknowledgement is unavailable')
		expect(() => observableRouter({ router: { navigate() {}, subscribe() {} } }, {})).toThrow(
			'observable router state and blockers',
		)
	})
})
