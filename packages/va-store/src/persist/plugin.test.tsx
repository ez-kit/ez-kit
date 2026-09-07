import { attachCapability, createServiceRegistry, pipe } from '@ez-kit/store-core'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createContextStore, type ContextStoreInit } from '../create-context-store'
import { StoreProvider } from '../store-provider'

import { createFakePersistAdapter } from './testing'
import { persistUrl } from './url'

import { paramString, persist, useHydrated, PERSIST_ENGINES, withPersist } from './index'

import type { StoreId } from '@ez-kit/store-core'

const STORE_ID: StoreId = { path: [], name: 'plugin-test', id: 'singleton' }

type Filters = { q: string }

// Accessor front: plain proxy + plugin `fields` builder.
const fieldsStore = createContextStore<Filters, { q?: string }>(({ defaultValue }: ContextStoreInit<{ q?: string }>) =>
	pipe(
		proxy<Filters>({ q: defaultValue.q ?? '' }),
		withPersist({
			fields: (field) => [field((s) => s.q, { source: 'url', parser: paramString() })],
		}),
	),
)

// Decorator front: class instance with `persistUrl` fields, discovered automatically.
class DecoratedFilters {
	@persistUrl() q = ''
}
const decoratedStore = createContextStore<DecoratedFilters, { q?: string }>(
	({ defaultValue }: ContextStoreInit<{ q?: string }>) => {
		const store = proxy(new DecoratedFilters())
		store.q = defaultValue.q ?? ''
		return pipe(store, withPersist())
	},
)

function makeView(store: { useSnapshot: () => { q: string } }) {
	return function QView(): ReactElement {
		const snap = store.useSnapshot()
		return <span data-testid='q'>{snap.q}</span>
	}
}

const cases = [
	{ name: 'persist({ fields }) (accessor)', store: fieldsStore },
	{ name: 'persist() (decorators)', store: decoratedStore },
] as const

describe('@ez-kit/va-store persist() plugin on a non-cached store', () => {
	for (const { name, store } of cases) {
		describe(name, () => {
			const QView = makeView(store)

			it('exposes the createContextStore API surface', () => {
				expect(typeof store.Provider).toBe('function')
				expect(typeof store.useSnapshot).toBe('function')
				expect(typeof store.useStore).toBe('function')
				expect(typeof store.Subscribe).toBe('function')
			})

			it('hydrates from the URL after mount', async () => {
				const fake = createFakePersistAdapter('?q=shoes')
				render(
					<StoreProvider persist={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</StoreProvider>,
				)
				await waitFor(() => {
					expect(screen.getByTestId('q')).toHaveTextContent('shoes')
				})
			})

			it('falls back to defaultValue when the param is absent', async () => {
				const fake = createFakePersistAdapter()
				render(
					<StoreProvider persist={[fake.adapter]}>
						<store.Provider defaultValue={{ q: 'fallback' }}>
							<QView />
						</store.Provider>
					</StoreProvider>,
				)
				await waitFor(() => {
					expect(screen.getByTestId('q')).toHaveTextContent('fallback')
				})
			})
		})
	}
})

describe('@ez-kit/va-store persist() plugin — service contract', () => {
	it('resolves PERSIST_ENGINES with one engine per mounted source', () => {
		const fake = createFakePersistAdapter()
		let sources: readonly string[] = []
		const inspector = createContextStore<{ ready: boolean }, { ready?: boolean }>(
			({ defaultValue }: ContextStoreInit<{ ready?: boolean }>) => {
				const state = proxy({ ready: defaultValue.ready ?? false })
				attachCapability(state, {
					name: 'inspect',
					setup: (_proxy, ctx) => {
						sources = ctx.services.get(PERSIST_ENGINES).sources()
						return undefined
					},
				})
				return state
			},
		)
		function Probe(): ReactElement {
			inspector.useSnapshot()
			return <span>ok</span>
		}
		render(
			<StoreProvider persist={[fake.adapter]}>
				<inspector.Provider defaultValue={{}}>
					<Probe />
				</inspector.Provider>
			</StoreProvider>,
		)
		expect(sources).toContain('url')
	})

	it('throws a named "service not mounted" error when no PERSIST_ENGINES service is mounted', () => {
		// Spec "Plugin owns no engine": the plugin never fabricates an engine; resolving the absent
		// service throws. Driven at the setup boundary so the throw is deterministic (no effect timing).
		const plugin = persist()
		const services = createServiceRegistry()
		expect(() => plugin.setup(proxy<Filters>({ q: '' }), { services, id: STORE_ID, isServer: false })).toThrow(
			/service not mounted/i,
		)
	})

	it('reports useHydrated true after mount for a synchronous (URL) source', async () => {
		const fake = createFakePersistAdapter()
		function Gate(): ReactElement {
			const store = fieldsStore.useStore()
			const hydrated = useHydrated(store)
			return <span data-testid='state'>{hydrated ? 'ready' : 'loading'}</span>
		}
		render(
			<StoreProvider persist={[fake.adapter]}>
				<fieldsStore.Provider defaultValue={{}}>
					<Gate />
				</fieldsStore.Provider>
			</StoreProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('state')).toHaveTextContent('ready')
		})
	})
})
