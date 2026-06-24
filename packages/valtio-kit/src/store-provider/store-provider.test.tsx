import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement, useSyncExternalStore } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createStore, type StoreInit } from '../create-store'
import { paramString } from '../persist/codecs'
import { persist } from '../persist/plugin'
import { PERSIST_ENGINES } from '../persist/service'
import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from '../persist/url/adapter'
import { createStoreCache } from '../store-cache'

import { StoreProvider } from './index'

import type { RenderScopedAdapter } from '../persist/provider'
import type { UrlDriver } from '../persist/url/adapter'

/**
 * A spy URL adapter over a shared in-memory location. `commit` counts navigations so a test can assert
 * that N cached stores binding `url` route through ONE engine (one writer) and coalesce into a single
 * navigation rather than N races.
 */
function createSpyUrlAdapter(initialSearch = ''): { adapter: RenderScopedAdapter; commitSpy: ReturnType<typeof vi.fn> } {
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
		const store = createStore<{ count: number }, { count?: number }>(
			({ defaultValue }: StoreInit<{ count?: number }>) => proxy({ count: defaultValue.count ?? 0 }),
			{
				plugins: [
					{
						name: 'probe',
						setup: (_proxy, ctx) => {
							resolvedSources = ctx.services.get(PERSIST_ENGINES).sources()
							return undefined
						},
					},
				],
			},
		)
		function View(): ReactElement {
			store.useSnapshot()
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
		const group = cache.createCachedStore<{ q: string }>(() => proxy({ q: '' }), {
			name: 'cached-persist',
			plugins: [persist({ fields: (field) => [field((s) => (s).q, { source: URL_SOURCE, parser: paramString() })] })],
		})

		function QView(): ReactElement {
			const snap = group.useSnapshot()
			return <span data-testid='q'>{snap.q}</span>
		}

		render(
			<StoreProvider persist={[adapter]} cache={cache}>
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

		const storeA = createStore<{ a: string }>(() => proxy({ a: '' }), {
			plugins: [persist({ fields: (field) => [field((s) => (s).a, { source: URL_SOURCE, key: 'a', parser: paramString() })] })],
		})
		const storeB = createStore<{ b: string }>(() => proxy({ b: '' }), {
			plugins: [persist({ fields: (field) => [field((s) => (s).b, { source: URL_SOURCE, key: 'b', parser: paramString() })] })],
		})

		function Editor(): ReactElement {
			const a = storeA.useStore()
			const b = storeB.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						// Two stores, one source: both mutations flow into the single url engine and coalesce.
						a.a = 'x'
						b.b = 'y'
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
		// One engine for `url` → the two coalesced mutations produce a single navigation, not two races.
		expect(commitSpy).toHaveBeenCalledTimes(1)
	})
})
