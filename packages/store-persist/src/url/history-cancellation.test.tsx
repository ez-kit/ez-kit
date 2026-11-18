import { act, render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from '../binding'
import { paramString } from '../codecs'
import { createPersistEngine } from '../engine'
import { SourceMutationCancelledError } from '../source-errors'
import { objectPort, observable } from '../test-kit'

import { reactRouterAdapter } from './react-router'

import type { SyncReadSourcePort } from '../types'

describe('history navigation cancelling an unfinished query mutation', () => {
	it.each([
		{ direction: -1, target: 'older' },
		{ direction: 1, target: 'later' },
	])('does not echo history $direction with an extra query commit', async ({ direction, target }) => {
		let port: SyncReadSourcePort | undefined
		let release!: () => void
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const loader = vi.fn(({ request }: { request: Request }) =>
			new URL(request.url).searchParams.get('q') === 'saving' ? gate : null,
		)
		function View() {
			port = reactRouterAdapter.usePort().port
			return null
		}
		const historyState = { from: 'history', scroll: 42 }
		const active = { pathname: '/page', search: '?q=initial', state: { from: 'active' } }
		const historical = { pathname: '/page', search: `?q=${target}`, state: historyState }
		const router = createMemoryRouter([{ path: '/page', element: <View />, loader }], {
			initialEntries: direction === -1 ? [historical, active] : [active, historical],
			initialIndex: direction === -1 ? 1 : 0,
		})
		const view = render(<RouterProvider router={router} />)
		await waitFor(() => {
			expect(port).toBeDefined()
		})
		if (!port) throw new Error('Missing URL port')
		const navigate = vi.spyOn(router, 'navigate')
		const state = observable({ q: 'initial' })
		const binding = createBinding(state, objectPort, [{ path: ['q'], parser: paramString() }], {})
		captureDefaults(binding)
		addressBinding(binding, { path: [], name: 'panel', id: 'one' })
		const engine = createPersistEngine(port, { ssrSafe: true })
		engine.seed(binding)
		const disconnect = engine.connect(binding)
		const unsubscribe = port.subscribe?.(() => {
			engine.pullSource()
		})
		let outcome: Promise<unknown> = Promise.resolve()
		try {
			await act(async () => {
				state.q = 'saving'
				outcome = engine.flush(binding).then(
					() => null,
					(error: unknown) => error,
				)
				await Promise.resolve()
			})
			expect(router.state.navigation.state).toBe('loading')
			await act(async () => {
				void router.navigate(direction)
				for (let i = 0; i < 20; i++) await Promise.resolve()
			})
			await waitFor(() => {
				expect(router.state.location.search).toBe(`?q=${target}`)
			})
			await act(async () => {
				for (let i = 0; i < 20; i++) await Promise.resolve()
			})
			expect(await outcome).toBeInstanceOf(SourceMutationCancelledError)
			expect(state.q).toBe(target)
			expect(binding.status.dirty).toBe(false)
			expect(navigate.mock.calls.filter(([to]) => typeof to === 'object')).toHaveLength(1)
			expect(
				loader.mock.calls.filter(([context]) => new URL(context.request.url).searchParams.get('q') === target),
			).toHaveLength(1)
			expect(router.state.location.state).toEqual(historyState)
			await engine.flush(binding)
			expect(navigate.mock.calls.filter(([to]) => typeof to === 'object')).toHaveLength(1)
		} finally {
			release()
			unsubscribe?.()
			disconnect()
			engine.dispose()
			view.unmount()
			router.dispose()
			await outcome
		}
	})
})
