import { attachCapability, createServiceRegistry } from '@ez-kit/store-core'
import { ServicesProvider, useCapabilities, useServices } from '@ez-kit/store-core/react'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { paramNumber, paramString } from './codecs'
import { urlHandle } from './handle'
import { persist, useHydrated } from './plugin'
import { PersistProvider } from './provider'
import { PERSIST_ENGINES } from './service'
import { objectPort, observable } from './test-kit'
import { createFakePersistAdapter } from './testing'
import { UrlHistory } from './url/adapter'
import { applyPersist } from './with-persist'

import type { FieldsBuilder } from './accessor'
import type { StoreId } from '@ez-kit/store-core'

const STORE_ID: StoreId = { path: [], name: 'plugin-test', id: 'singleton' }

type Filters = { q: string; page: number }

const filterFields: FieldsBuilder<Filters> = (field) => [
	field((state) => state.q, { source: 'url', parser: paramString() }),
	field((state) => state.page, { source: 'url', parser: paramNumber() }),
]

/**
 * The mount seam a binding package's `createContextStore` provides, reduced to the part this package
 * owns: resolve the services published by `PersistProvider`, run the store's capabilities.
 */
function Mount({ store, children }: { store: object; children?: ReactNode }): ReactElement {
	const services = useServices()
	useCapabilities(store, services, STORE_ID)
	return <>{children}</>
}

function makeStore(initial: Partial<Filters> = {}): Filters {
	return observable<Filters>({ q: '', page: 1, ...initial })
}

describe('@ez-kit/store-persist persist() plugin', () => {
	it('hydrates a store from the substrate on mount', async () => {
		const fake = createFakePersistAdapter('?q=shoes&page=3')
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider adapters={[fake.adapter]}>
				<Mount store={store} />
			</PersistProvider>,
		)

		await waitFor(() => {
			expect(store.q).toBe('shoes')
		})
		expect(store.page).toBe(3)
	})

	it('commits a store change back to the substrate', async () => {
		const fake = createFakePersistAdapter()
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider adapters={[fake.adapter]}>
				<Mount store={store} />
			</PersistProvider>,
		)

		store.q = 'boots'

		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=boots')
		})
	})

	it('pulls an external substrate change into the store', async () => {
		const fake = createFakePersistAdapter('?q=shoes')
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider adapters={[fake.adapter]}>
				<Mount store={store} />
			</PersistProvider>,
		)
		await waitFor(() => {
			expect(store.q).toBe('shoes')
		})

		fake.setSearch('?q=sandals')

		await waitFor(() => {
			expect(store.q).toBe('sandals')
		})
	})

	it('routes a meta-tagged mutation through the $url handle', async () => {
		const fake = createFakePersistAdapter()
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider adapters={[fake.adapter]}>
				<Mount store={store} />
			</PersistProvider>,
		)

		expect(urlHandle(store).source).toBe('url')
		urlHandle(store).runWithMeta({ history: UrlHistory.Push }, () => {
			store.q = 'sandals'
		})

		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=sandals')
		})
	})

	it('disconnects the binding when the mount unmounts', async () => {
		const fake = createFakePersistAdapter()
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		const view = render(
			<PersistProvider adapters={[fake.adapter]}>
				<Mount store={store} />
			</PersistProvider>,
		)
		store.q = 'boots'
		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=boots')
		})

		view.unmount()
		fake.setSearch('')
		store.q = 'sneakers'
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Disconnected: neither a store write nor an external change moves anything any more.
		expect(fake.getSearch()).toBe('')
		expect(store.q).toBe('sneakers')
	})

	it('reports "false" from useHydrated until the first read has been applied', async () => {
		const fake = createFakePersistAdapter('?q=shoes')
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		function Status(): ReactElement {
			return <span data-testid='hydrated'>{String(useHydrated(store))}</span>
		}

		render(
			<PersistProvider adapters={[fake.adapter]}>
				<Mount store={store}>
					<Status />
				</Mount>
			</PersistProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('hydrated')).toHaveTextContent('true')
		})
	})

	it('degrades to an inert binding, with a warning, when no engine serves the source', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const store = makeStore()
		applyPersist(store, objectPort, { fields: filterFields })

		// The engines service is mounted, but it publishes no engine for the `url` source.
		const registry = createServiceRegistry([
			[
				PERSIST_ENGINES,
				{
					get: () => {
						throw new Error('no engine')
					},
					safeGet: () => undefined,
					sources: () => [],
				},
			],
		])

		expect(() =>
			render(
				<ServicesProvider registry={registry}>
					<Mount store={store} />
				</ServicesProvider>,
			),
		).not.toThrow()

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no engine mounted for source "url"'))
		warn.mockRestore()
	})

	it('throws a named error when the engines service is not mounted at all', () => {
		const store = observable<Filters>({ q: '', page: 1 })
		attachCapability(store, persist(objectPort, { fields: filterFields }))

		expect(() => render(<Mount store={store} />)).toThrow(/service not mounted/)
	})
})
