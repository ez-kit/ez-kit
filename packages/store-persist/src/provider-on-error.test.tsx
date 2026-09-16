import { useCapabilities, useServices } from '@ez-kit/store-core/react'
import { act, render, waitFor } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { paramString } from './codecs'
import { PersistProvider } from './provider'
import { objectPort, observable } from './test-kit'
import { applyPersist } from './with-persist'

import type { FieldsBuilder } from './accessor'
import type { AmbientAdapter } from './provider'
import type { Keyed, SourcePort } from './types'
import type { StoreId } from '@ez-kit/store-core'

/** Let an already-resolved async `get()` settle, so hydration's rebaseline happens before we write. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const STORE_ID: StoreId = { path: [], name: 'on-error-test', id: 'singleton' }

type Filters = { q: string }

const filterFields: FieldsBuilder<Filters> = (field) => [
	field((state) => state.q, { source: 'remote', parser: paramString() }),
]

function Mount({ store, children }: { store: object; children?: ReactNode }): ReactElement {
	const services = useServices()
	useCapabilities(store, services, STORE_ID)
	return <>{children}</>
}

/** An async adapter whose I/O always rejects — the shape a custom REST/IndexedDB port can take. */
function failingAdapter(failures: { get?: Error; set?: Error }): AmbientAdapter {
	const port: SourcePort = {
		get: (): Promise<Keyed> =>
			failures.get ? Promise.reject(failures.get) : Promise.resolve(new Map<string, string>()),
		set: (): Promise<void> => (failures.set ? Promise.reject(failures.set) : Promise.resolve()),
	}
	return { source: 'remote', port }
}

describe('@ez-kit/store-persist PersistProvider onError', () => {
	it('reports a rejected async get() to onError with the failing source', async () => {
		const boom = new Error('GET /me/preferences failed')
		const onError = vi.fn()
		const store = observable<Filters>({ q: '' })
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider
				adapters={[failingAdapter({ get: boom })]}
				onError={onError}
			>
				<Mount store={store} />
			</PersistProvider>,
		)

		await waitFor(() => {
			expect(onError).toHaveBeenCalledWith(boom, { source: 'remote' })
		})
	})

	it('reports a rejected async set() to onError', async () => {
		const boom = new Error('PUT /me/preferences failed')
		const onError = vi.fn()
		const store = observable<Filters>({ q: '' })
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider
				adapters={[failingAdapter({ set: boom })]}
				onError={onError}
			>
				<Mount store={store} />
			</PersistProvider>,
		)

		await act(tick)
		store.q = 'shoes'

		await waitFor(() => {
			expect(onError).toHaveBeenCalledWith(boom, { source: 'remote' })
		})
	})

	it('calls the handler the latest render passed, not the one the engines were built with', async () => {
		const first = vi.fn()
		const second = vi.fn()
		const boom = new Error('PUT /me/preferences failed')
		const store = observable<Filters>({ q: '' })
		applyPersist(store, objectPort, { fields: filterFields })
		const adapters = [failingAdapter({ set: boom })]

		const { rerender } = render(
			<PersistProvider
				adapters={adapters}
				onError={first}
			>
				<Mount store={store} />
			</PersistProvider>,
		)
		await act(tick)

		rerender(
			<PersistProvider
				adapters={adapters}
				onError={second}
			>
				<Mount store={store} />
			</PersistProvider>,
		)
		store.q = 'shoes'

		await waitFor(() => {
			expect(second).toHaveBeenCalledWith(boom, { source: 'remote' })
		})
		expect(first).not.toHaveBeenCalled()
	})

	it('swallows the rejection when no onError is given', async () => {
		const unhandled = vi.fn()
		process.on('unhandledRejection', unhandled)
		const store = observable<Filters>({ q: '' })
		applyPersist(store, objectPort, { fields: filterFields })

		render(
			<PersistProvider adapters={[failingAdapter({ get: new Error('quiet') })]}>
				<Mount store={store} />
			</PersistProvider>,
		)

		await new Promise((resolve) => setTimeout(resolve, 0))
		process.off('unhandledRejection', unhandled)
		expect(unhandled).not.toHaveBeenCalled()
	})
})
