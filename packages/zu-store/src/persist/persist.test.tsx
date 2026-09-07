import { pipe } from '@ez-kit/store-core'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore, type ContextStoreInit } from '../create-context-store'
import { StoreProvider } from '../store-provider'

import { createFakePersistAdapter } from './testing'
import { UrlHistory } from './url'

import { paramNumber, paramString, persist, urlHandle, withPersist } from './index'

import type { FieldsBuilder } from './index'

type Filters = { q: string; page: number }

const filterFields: FieldsBuilder<Filters> = (field) => [
	field((state) => state.q, { source: 'url', parser: paramString() }),
	field((state) => state.page, { source: 'url', parser: paramNumber() }),
]

/** The documented shape: capabilities are attached to the store handle through `pipe`. */
const pipedStore = createContextStore<ReturnType<typeof makeStore>, { q?: string }>(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) =>
		pipe(makeStore(defaultValue.q ?? ''), withPersist({ fields: filterFields })),
)

/** The same capability declared on the factory instead of on the store value. */
const pluggedStore = createContextStore<ReturnType<typeof makeStore>, { q?: string }>(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) => makeStore(defaultValue.q ?? ''),
	{ plugins: [persist<ReturnType<typeof makeStore>>({ fields: filterFields })] },
)

function makeStore(q: string) {
	return createStore<Filters>()(() => ({ q, page: 1 }))
}

function makeView(store: { useSelector: <T>(selector: (state: Filters) => T) => T }) {
	return function FiltersView(): ReactElement {
		const q = store.useSelector((state) => state.q)
		const page = store.useSelector((state) => state.page)
		return (
			<span data-testid='state'>
				{q}:{page}
			</span>
		)
	}
}

const cases = [
	{ name: 'pipe(store, withPersist())', store: pipedStore },
	{ name: 'createContextStore(factory, { plugins: [persist()] })', store: pluggedStore },
] as const

describe('@ez-kit/zu-store persist', () => {
	for (const { name, store } of cases) {
		describe(name, () => {
			const View = makeView(store)

			it('hydrates the store from the URL after mount', async () => {
				const fake = createFakePersistAdapter('?q=shoes&page=3')
				render(
					<StoreProvider persist={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<View />
						</store.Provider>
					</StoreProvider>,
				)

				await waitFor(() => {
					expect(screen.getByTestId('state')).toHaveTextContent('shoes:3')
				})
			})

			it('keeps the factory value when the substrate is empty', async () => {
				const fake = createFakePersistAdapter()
				render(
					<StoreProvider persist={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<View />
						</store.Provider>
					</StoreProvider>,
				)

				await waitFor(() => {
					expect(screen.getByTestId('state')).toHaveTextContent('fallback:1')
				})
			})

			it('commits a store write to the substrate', async () => {
				const fake = createFakePersistAdapter()
				const captured: { handle: ReturnType<typeof makeStore> | null } = { handle: null }

				function Capture(): ReactElement {
					captured.handle = store.useStore()
					return <View />
				}

				render(
					<StoreProvider persist={[fake.adapter]}>
						<store.Provider defaultValue={{ q: '' }}>
							<Capture />
						</store.Provider>
					</StoreProvider>,
				)

				await waitFor(() => {
					expect(captured.handle).not.toBeNull()
				})
				captured.handle?.setState({ q: 'boots' })

				await waitFor(() => {
					expect(fake.getSearch()).toContain('q=boots')
				})
			})
		})
	}

	it('applies a multi-field hydration as ONE state change', async () => {
		const fake = createFakePersistAdapter('?q=shoes&page=3')
		const store = pipe(makeStore(''), withPersist({ fields: filterFields }))
		const seen: Filters[] = []
		store.subscribe((state) => seen.push(state))

		const contextStore = createContextStore<typeof store>(() => store)
		render(
			<StoreProvider persist={[fake.adapter]}>
				<contextStore.Provider>
					<span />
				</contextStore.Provider>
			</StoreProvider>,
		)

		await waitFor(() => {
			expect(store.getState().q).toBe('shoes')
		})
		// Two fields arrived, but the port wrote them in one batch — so one notification, not two.
		expect(seen).toHaveLength(1)
		expect(seen[0]).toMatchObject({ q: 'shoes', page: 3 })
	})

	it('exposes the $url handle on the store handle', async () => {
		const fake = createFakePersistAdapter()
		const store = pipe(makeStore(''), withPersist({ fields: filterFields }))
		const contextStore = createContextStore<typeof store>(() => store)

		render(
			<StoreProvider persist={[fake.adapter]}>
				<contextStore.Provider>
					<span />
				</contextStore.Provider>
			</StoreProvider>,
		)

		expect(store.$url.source).toBe('url')
		urlHandle(store).runWithMeta({ history: UrlHistory.Push }, () => {
			store.setState({ q: 'sandals' })
		})

		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=sandals')
		})
	})
})
