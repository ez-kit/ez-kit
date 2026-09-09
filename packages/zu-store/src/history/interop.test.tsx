import { capabilitiesOf, pipe } from '@ez-kit/store-core'
import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'
import { paramString, useHydrated, withPersist } from '../persist'
import { createFakePersistAdapter } from '../persist/testing'
import { StoreProvider } from '../store-provider'

import { withHistory } from './with-history'

import type { HistoryOptions, HistoryState } from './types'
import type { StoreApi } from 'zustand/vanilla'

const flush = () =>
	new Promise<void>((resolve) => {
		queueMicrotask(resolve)
	})

type Filters = { q: string }

/**
 * The documented composition order: `withHistory` is a Zustand middleware, so it must already wrap
 * `set` by the time persist's `setup` pushes a hydrated value in — hence it goes on the initializer,
 * inside the store, and `withPersist` wraps the finished handle.
 */
function makeFiltersHandle(historyOptions?: HistoryOptions<Filters>) {
	return pipe(
		createStore<Filters>()(withHistory(() => ({ q: '' }), historyOptions)),
		withPersist<StoreApi<Filters> & { history: StoreApi<HistoryState<Filters>> }>({
			fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
		}),
	)
}

type FiltersStore = ReturnType<typeof makeFiltersHandle>

function makeQueryStore(historyOptions?: HistoryOptions<Filters>) {
	return createContextStore<FiltersStore>(() => makeFiltersHandle(historyOptions))
}

describe('history interop', () => {
	it('records persist hydration as a step by default', async () => {
		// The fake adapter starts seeded with q=seeded — hydration arrives as a separate (async) batch,
		// after the initializer has finished, so history is already recording when it lands.
		const store = makeQueryStore()
		const fake = createFakePersistAdapter('q=seeded')
		let instance!: FiltersStore
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		render(
			<StoreProvider persist={[fake.adapter]}>
				<store.Provider>
					<Probe />
				</store.Provider>
			</StoreProvider>,
		)
		await act(flush)

		expect(instance.getState().q).toBe('seeded')
		expect(instance.history.getState().pasts).toEqual([{ q: '' }])
	})

	it('keeps hydration out of history with defaultPaused + resume on hydrated', async () => {
		const store = makeQueryStore({ defaultPaused: true })
		const fake = createFakePersistAdapter('q=seeded')
		let instance!: FiltersStore
		function Probe(): null {
			instance = store.useStore()
			const hydrated = useHydrated(instance)
			useEffect(() => {
				if (hydrated) instance.history.getState().resume()
			}, [hydrated])
			return null
		}

		render(
			<StoreProvider persist={[fake.adapter]}>
				<store.Provider>
					<Probe />
				</store.Provider>
			</StoreProvider>,
		)
		await act(flush)

		expect(instance.getState().q).toBe('seeded')
		expect(instance.history.getState().pasts).toHaveLength(0)

		await act(async () => {
			instance.setState({ q: 'typed' })
			await flush()
		})

		expect(instance.history.getState().pasts).toEqual([{ q: 'seeded' }])
	})

	it('commits an undo back into persist', async () => {
		const store = makeQueryStore({ defaultPaused: true })
		const fake = createFakePersistAdapter('q=seeded')
		let instance!: FiltersStore
		function Probe(): null {
			instance = store.useStore()
			const hydrated = useHydrated(instance)
			useEffect(() => {
				if (hydrated) instance.history.getState().resume()
			}, [hydrated])
			return null
		}

		render(
			<StoreProvider persist={[fake.adapter]}>
				<store.Provider>
					<Probe />
				</store.Provider>
			</StoreProvider>,
		)
		await act(flush)

		await act(async () => {
			instance.setState({ q: 'typed' })
			await flush()
		})
		expect(fake.getSearch()).toContain('q=typed')

		// Undo is a write like any other, so it flows out to the source.
		await act(async () => {
			instance.history.getState().undo()
			await flush()
		})
		expect(instance.getState().q).toBe('seeded')
		expect(fake.getSearch()).toContain('q=seeded')
	})

	it('registers persist as the only mount-time capability — history needs no setup', () => {
		const handle = makeFiltersHandle()

		// Unlike `@ez-kit/va-store`, history here is a middleware: it is in place before the handle
		// exists and has nothing to wire up on mount, so it never enters the capability registry.
		expect(capabilitiesOf(handle).map((plugin) => plugin.name)).toEqual(['persist'])
	})
})
