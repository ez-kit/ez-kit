import { capabilitiesOf, pipe } from '@ez-kit/store-core'
import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createContextStore } from '../create-context-store'
import { paramString } from '../persist/codecs'
import { useHydrated } from '../persist/plugin'
import { createFakePersistAdapter } from '../persist/testing/fake-persist-adapter'
import { withPersist } from '../persist/with-persist'
import { createStoreCache } from '../store-cache'
import { StoreProvider } from '../store-provider'

import { withHistory } from './with-history'

const flush = () =>
	new Promise<void>((resolve) => {
		queueMicrotask(resolve)
	})

/** Eviction window for the gcTime test below — short, real wall-clock time (matches store-cache.test.tsx). */
const GC_TIME = 200
const PAST_GC_TIME = GC_TIME * 2

type Filters = { q: string }

/** Builds a `pipe(..., withHistory(), withPersist())` chain bound to the `url` source via the accessor front. */
function makeQueryStore(historyOptions?: Parameters<typeof withHistory<Filters>>[0]) {
	return createContextStore(() =>
		pipe(
			proxy<Filters>({ q: '' }),
			withHistory(historyOptions),
			withPersist({
				fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
			}),
		),
	)
}

describe('history interop', () => {
	it('records persist hydration as a step by default', async () => {
		// The fake adapter starts seeded with q=seeded — hydration arrives as a separate (async) batch,
		// so it does NOT fall under the "first batch = baseline" rule.
		const store = makeQueryStore()
		const fake = createFakePersistAdapter('q=seeded')
		let instance!: ReturnType<typeof store.useStore>
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

		expect(instance.q).toBe('seeded')
		expect(instance.history.state.pasts).toEqual([{ q: '' }])
	})

	it('keeps hydration out of history with defaultPaused + resume on hydrated', async () => {
		const store = makeQueryStore({ defaultPaused: true })
		const fake = createFakePersistAdapter('q=seeded')
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			const hydrated = useHydrated(instance)
			useEffect(() => {
				if (hydrated) instance.history.resume()
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

		expect(instance.q).toBe('seeded')
		expect(instance.history.state.pasts).toHaveLength(0)

		await act(async () => {
			instance.q = 'typed'
			await flush()
		})

		expect(instance.history.state.pasts).toEqual([{ q: 'seeded' }])
	})

	it('commits an undo back into persist', async () => {
		// Same setup as above: defaultPaused + resume-on-hydrated, so the hydration itself never becomes
		// a history step, but a later local write does.
		const store = makeQueryStore({ defaultPaused: true })
		const fake = createFakePersistAdapter('q=seeded')
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			const hydrated = useHydrated(instance)
			useEffect(() => {
				if (hydrated) instance.history.resume()
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
			instance.q = 'typed'
			await flush()
		})
		// The value must actually leave the URL before the undo assertion below can mean anything —
		// otherwise a broken persist binding that never writes back would still read the seeded value.
		expect(fake.getSearch()).toBe('q=typed')

		await act(async () => {
			instance.history.undo()
			await flush()
		})

		expect(instance.q).toBe('seeded')
		expect(fake.getSearch()).toContain('q=seeded')
	})

	it('attaches history before persist in the pipe(..., withHistory(), withPersist()) chain', () => {
		const state = pipe(
			proxy<Filters>({ q: '' }),
			withHistory(),
			withPersist({
				fields: (field) => [field((s) => s.q, { source: 'url', parser: paramString() })],
			}),
		)

		// withHistory attaches first (it wraps the innermost proxy), withPersist attaches second — the
		// Provider then runs setups in this same attachment order, innermost first.
		expect(capabilitiesOf(state).map((plugin) => plugin.name)).toEqual(['history', 'persist'])
	})

	it('records an externally pushed controlled value and converges after undo', async () => {
		const store = createContextStore(() => pipe(proxy({ q: '' }), withHistory()))
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		const onValueChange = vi.fn()
		const view = render(
			<store.Provider
				value={{ q: 'a' }}
				onValueChange={onValueChange}
			>
				<Probe />
			</store.Provider>,
		)
		await act(flush)

		// First frame is the baseline, not a step.
		expect(instance.history.state.pasts).toHaveLength(0)

		view.rerender(
			<store.Provider
				value={{ q: 'b' }}
				onValueChange={onValueChange}
			>
				<Probe />
			</store.Provider>,
		)
		await act(flush)

		expect(instance.q).toBe('b')
		expect(instance.history.state.pasts).toHaveLength(1)

		await act(async () => {
			instance.history.undo()
			await flush()
		})

		// undo writes into a controlled key -> the store asks its owner to converge back to 'a'.
		expect(instance.q).toBe('a')
		expect(onValueChange).toHaveBeenLastCalledWith({ q: 'a' })
	})

	it('keeps history across a remount inside gcTime and drops it after', async () => {
		const cache = createStoreCache({ gcTime: GC_TIME })
		const group = cache.createCachedStore(() => pipe(proxy({ count: 0 }), withHistory()), { name: 'counter' })

		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					{show ? (
						<group.Provider id='counter'>
							<span />
						</group.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(<App show={true} />)
		act(() => {
			const live = group.getFromCache({ id: 'counter' })
			if (live) live.count = 1
		})
		await act(flush)
		expect(group.getFromCache({ id: 'counter' })?.history.state.pasts).toHaveLength(1)

		// Unmount and remount within gcTime — the entry (and its recorded step) survives.
		rerender(<App show={false} />)
		rerender(<App show={true} />)
		expect(group.getFromCache({ id: 'counter' })?.history.state.pasts).toHaveLength(1)

		// Unmount and wait past gcTime — the entry is evicted.
		rerender(<App show={false} />)
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, PAST_GC_TIME))
		})
		expect(group.getFromCache({ id: 'counter' })).toBeUndefined()

		// Remount: a fresh entry, so a fresh history with no recorded steps.
		rerender(<App show={true} />)
		expect(group.getFromCache({ id: 'counter' })?.history.state.pasts).toHaveLength(0)
	})

	it('keeps recording after the Provider unmounts', async () => {
		const store = createContextStore(() => pipe(proxy({ count: 0 }), withHistory()))
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		const view = render(
			<store.Provider>
				<Probe />
			</store.Provider>,
		)
		await act(flush)
		view.unmount()

		instance.count = 1
		await flush()

		// The subscription lives on the proxy itself, so recording continues — this pins the ACTUAL
		// behavior down explicitly so it never changes silently: an orphaned proxy is observed by nobody
		// and goes to GC.
		expect(instance.history.state.pasts).toHaveLength(1)
	})
})
