import { act, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createStoreCache } from '../store-cache'
import { StoreProvider } from '../store-provider'

import { paramString } from './codecs'
import { persist } from './plugin'
import { createFakePersistAdapter } from './testing/fake-persist-adapter'

import type { StoreCache } from '../store-cache'
import type { CachedStoreFactoryInit } from '@ez-kit/store-core/cache'

/** `q` is mirrored to the URL; `note` deliberately is not — it can only survive via the cache. */
type Filters = { q: string; note: string }
type FiltersSeed = { q?: string; note?: string }

/**
 * A cached store group that ALSO carries `persist()`. The two layers compose through `plugins`:
 * the cache owns the proxy's lifetime, the plugin mirrors its fields to the URL source.
 */
function createCachedFilters(cache: StoreCache, name: string) {
	return cache.createCachedStore<Filters, FiltersSeed>(
		({ defaultValue }: CachedStoreFactoryInit<FiltersSeed>) =>
			proxy<Filters>({ q: defaultValue.q ?? '', note: defaultValue.note ?? '' }),
		{
			name,
			plugins: [persist({ fields: (field) => [field((s) => s.q, { source: 'url', parser: paramString() })] })],
		},
	)
}

describe('@ez-kit/va-store persist() on a cached store', () => {
	it('hydrates a newly created cache entry from the URL', async () => {
		const fake = createFakePersistAdapter('?q=shoes')
		const cache = createStoreCache()
		const filters = createCachedFilters(cache, 'cold-start')

		function QView(): ReactElement {
			return <span data-testid='q'>{filters.useSnapshot().q}</span>
		}

		render(
			<StoreProvider
				persist={[fake.adapter]}
				cache={cache}
			>
				<filters.Provider
					id='main'
					defaultValue={{ q: 'fallback' }}
				>
					<QView />
				</filters.Provider>
			</StoreProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})
	})

	it('keeps an edited value across unmount/remount instead of re-seeding from defaultValue', async () => {
		const fake = createFakePersistAdapter()
		const cache = createStoreCache()
		const filters = createCachedFilters(cache, 'keep-alive')

		function QView(): ReactElement {
			const snap = filters.useSnapshot()
			return (
				<>
					<span data-testid='q'>{snap.q}</span>
					<span data-testid='note'>{snap.note}</span>
				</>
			)
		}
		function App({ show }: { show: boolean }): ReactElement {
			return (
				<StoreProvider
					persist={[fake.adapter]}
					cache={cache}
				>
					{show ? (
						<filters.Provider
							id='main'
							defaultValue={{ q: 'seed', note: 'seed-note' }}
						>
							<QView />
						</filters.Provider>
					) : null}
				</StoreProvider>
			)
		}

		const { rerender } = render(<App show={true} />)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('seed')
		})

		// Two edits: `q` is written through to the URL, `note` lives only in the proxy.
		act(() => {
			const live = filters.getFromCache({ id: 'main' })
			if (live) {
				live.q = 'boots'
				live.note = 'draft'
			}
		})
		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=boots')
		})

		rerender(<App show={false} />)
		rerender(<App show={true} />)

		// The cache handed back the same proxy, so both edits are still there — `defaultValue` is ignored.
		// `note` is the decisive one: it is in no source, so a re-created entry would show 'seed-note'.
		expect(screen.getByTestId('q')).toHaveTextContent('boots')
		expect(screen.getByTestId('note')).toHaveTextContent('draft')
		expect(filters.getFromCache({ id: 'main' })?.note).toBe('draft')
	})

	it('stays bound to the source while cached with no Provider mounted', async () => {
		const fake = createFakePersistAdapter('?q=shoes')
		const cache = createStoreCache()
		const filters = createCachedFilters(cache, 'unmounted-binding')

		function QView(): ReactElement {
			return <span data-testid='q'>{filters.useSnapshot().q}</span>
		}
		function App({ show }: { show: boolean }): ReactElement {
			return (
				<StoreProvider
					persist={[fake.adapter]}
					cache={cache}
				>
					{show ? (
						<filters.Provider
							id='main'
							defaultValue={{}}
						>
							<QView />
						</filters.Provider>
					) : null}
				</StoreProvider>
			)
		}

		const { rerender } = render(<App show={true} />)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})

		// Provider gone, entry still cached: the plugin's lifetime is the entry's, not the mount's.
		rerender(<App show={false} />)

		// An external change (back button, another tab) while nothing renders the store.
		act(() => {
			fake.setSearch('?q=hats')
		})

		await waitFor(() => {
			expect(filters.getFromCache({ id: 'main' })?.q).toBe('hats')
		})

		rerender(<App show={true} />)
		expect(screen.getByTestId('q')).toHaveTextContent('hats')
	})

	it('re-hydrates from the source after the entry is evicted with gcTime={0}', async () => {
		const fake = createFakePersistAdapter('?q=shoes')
		const cache = createStoreCache()
		const filters = createCachedFilters(cache, 'evicted')

		function QView(): ReactElement {
			return <span data-testid='q'>{filters.useSnapshot().q}</span>
		}
		function App({ show }: { show: boolean }): ReactElement {
			return (
				<StoreProvider
					persist={[fake.adapter]}
					cache={cache}
				>
					{show ? (
						<filters.Provider
							id='main'
							gcTime={0}
							defaultValue={{ q: 'fallback' }}
						>
							<QView />
						</filters.Provider>
					) : null}
				</StoreProvider>
			)
		}

		const { rerender } = render(<App show={true} />)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})

		rerender(<App show={false} />)
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})
		expect(filters.getFromCache({ id: 'main' })).toBeUndefined()

		// A fresh entry: the plugin runs again, so the URL — not `defaultValue` — seeds it.
		fake.setSearch('?q=hats')
		rerender(<App show={true} />)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('hats')
		})
	})
})
