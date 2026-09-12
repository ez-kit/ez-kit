import { attachCapability, pipe } from '@ez-kit/store-core'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement, useSyncExternalStore } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore, type ContextStoreInit } from '../create-context-store'
import { paramString, PERSIST_ENGINES, withPersist } from '../persist'
import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from '../persist/url'
import { createStoreCache } from '../store-cache'

import { StoreProvider } from './index'

import type { RenderScopedAdapter } from '../persist'
import type { UrlDriver } from '../persist/url'
import type { StoreApi } from 'zustand/vanilla'

/**
 * A spy URL adapter over a shared in-memory location. `commit` counts navigations so a test can assert
 * that N cached stores binding `url` route through ONE engine (one writer) and coalesce into a single
 * navigation rather than N races.
 */
function createSpyUrlAdapter(initialSearch = ''): {
	adapter: RenderScopedAdapter
	commitSpy: ReturnType<typeof vi.fn>
} {
	let current = new URLSearchParams(initialSearch)
	const listeners = new Set<() => void>()
	const commitSpy = vi.fn()

	const driver: UrlDriver = {
		read: () => new URLSearchParams(current),
		commit: (next) => {
			commitSpy()
			current = new URLSearchParams(next)
			for (const listener of listeners) listener()
		},
	}
	const port = createUrlPort(driver)

	const adapter: RenderScopedAdapter = {
		source: URL_SOURCE,
		mergeMeta: urlMetaMerge,
		defaultMeta: { history: UrlHistory.Replace },
		usePort() {
			const changeKey = useSyncExternalStore(
				(onChange) => {
					listeners.add(onChange)
					return () => {
						listeners.delete(onChange)
					}
				},
				() => current.toString(),
				() => current.toString(),
			)
			return { port, changeKey }
		},
	}

	return { adapter, commitSpy }
}

describe('StoreProvider — service resolution', () => {
	it('exposes the PERSIST_ENGINES service to a plugin under StoreProvider', async () => {
		const { adapter } = createSpyUrlAdapter()
		let resolvedSources: readonly string[] = []
		const store = createContextStore<StoreApi<{ count: number }>, { count?: number }>(
			({ defaultValue }: ContextStoreInit<{ count?: number }>) => {
				const handle = createStore<{ count: number }>()(() => ({ count: defaultValue.count ?? 0 }))
				attachCapability(handle, {
					name: 'probe',
					setup: (_store, ctx) => {
						resolvedSources = ctx.services.get(PERSIST_ENGINES).sources()
						return undefined
					},
				})
				return handle
			},
		)
		function View(): ReactElement {
			store.useSelector((state) => state.count)
			return <span data-testid='ok'>ok</span>
		}
		render(
			<StoreProvider persist={[adapter]}>
				<store.Provider defaultValue={{}}>
					<View />
				</store.Provider>
			</StoreProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('ok')).toBeInTheDocument()
		})
		expect(resolvedSources).toEqual([URL_SOURCE])
	})

	it('drives a cached, persisted store via the cache layer under StoreProvider', async () => {
		const { adapter } = createSpyUrlAdapter('?q=cached')
		const cache = createStoreCache()
		const group = cache.createCachedStore<StoreApi<{ q: string }>>(
			() =>
				pipe(
					createStore<{ q: string }>()(() => ({ q: '' })),
					withPersist<StoreApi<{ q: string }>>({
						fields: (field) => [field((state) => state.q, { source: URL_SOURCE, parser: paramString() })],
					}),
				),
			{ name: 'cached-persist' },
		)

		function QView(): ReactElement {
			return <span data-testid='q'>{group.useSelector((state) => state.q)}</span>
		}

		render(
			<StoreProvider
				persist={[adapter]}
				cache={cache}
			>
				<group.Provider id='one'>
					<QView />
				</group.Provider>
			</StoreProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('cached')
		})
	})
})

describe('StoreProvider — single writer for one source', () => {
	it('routes many url-bound stores through one engine (commits coalesce, no races)', async () => {
		const { adapter, commitSpy } = createSpyUrlAdapter()

		const storeA = createContextStore<StoreApi<{ a: string }>>(() =>
			pipe(
				createStore<{ a: string }>()(() => ({ a: '' })),
				withPersist<StoreApi<{ a: string }>>({
					fields: (field) => [field((state) => state.a, { source: URL_SOURCE, key: 'a', parser: paramString() })],
				}),
			),
		)
		const storeB = createContextStore<StoreApi<{ b: string }>>(() =>
			pipe(
				createStore<{ b: string }>()(() => ({ b: '' })),
				withPersist<StoreApi<{ b: string }>>({
					fields: (field) => [field((state) => state.b, { source: URL_SOURCE, key: 'b', parser: paramString() })],
				}),
			),
		)

		function Editor(): ReactElement {
			const a = storeA.useStore()
			const b = storeB.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						// Two stores, one source: both writes flow into the single url engine and coalesce.
						a.setState({ a: 'x' })
						b.setState({ b: 'y' })
					}}
				/>
			)
		}

		render(
			<StoreProvider persist={[adapter]}>
				<storeA.Provider>
					<storeB.Provider>
						<Editor />
					</storeB.Provider>
				</storeA.Provider>
			</StoreProvider>,
		)

		commitSpy.mockClear()
		screen.getByTestId('go').click()

		await waitFor(() => {
			expect(commitSpy).toHaveBeenCalled()
		})
		// One engine for `url` → the two coalesced writes produce a single navigation, not two races.
		expect(commitSpy).toHaveBeenCalledTimes(1)
	})
})
