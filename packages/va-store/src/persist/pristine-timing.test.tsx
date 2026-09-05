import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { createContextStore, type ContextStoreInit } from '../create-context-store'
import { StoreProvider } from '../store-provider'

import { paramString } from './codecs'
import { createFakePersistAdapter } from './testing/fake-persist-adapter'
import { withPersist } from './with-persist'

const flush = () =>
	new Promise<void>((resolve) => {
		queueMicrotask(resolve)
	})

const FACTORY_DEFAULT = 'factory-default'
const CONTROLLED = 'controlled'
const DEEP_LINK = 'deep-link'

type Filters = { q: string }

/**
 * A URL-persisted store whose `q` can also be driven by the Provider's controlled `value` prop —
 * the only configuration in which the timing of the pristine-default capture is observable, because
 * it is the only one where the value the factory produced and the value the first render shows
 * differ.
 */
const filtersStore = createContextStore<Filters, { q?: string }>(({ defaultValue }: ContextStoreInit<{ q?: string }>) =>
	withPersist(proxy<Filters>({ q: defaultValue.q ?? FACTORY_DEFAULT }), {
		fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
	}),
)

function renderWithUrl(search: string, value?: Partial<Filters>) {
	const fake = createFakePersistAdapter(search)
	const onValueChange = vi.fn()
	let instance!: Filters
	function Probe(): null {
		instance = filtersStore.useStore()
		return null
	}

	render(
		<StoreProvider persist={[fake.adapter]}>
			<filtersStore.Provider
				defaultValue={{}}
				onValueChange={onValueChange}
				{...(value ? { value } : {})}
			>
				<Probe />
			</filtersStore.Provider>
		</StoreProvider>,
	)

	return {
		fake,
		onValueChange,
		get instance() {
			return instance
		},
	}
}

/**
 * Pins WHEN a persist binding captures each field's pristine default, and what that decides.
 *
 * `withPersist` constructs its bindings in the factory phase (that is what makes `$url` / `$persist`
 * typed on the returned store), but each binding still reads its defaults when it CONNECTS, in the
 * plugin's `setup` on mount. The two moments are not interchangeable: `createContextStore`'s Provider
 * applies a controlled `value` synchronously during the first render, between them.
 *
 * The default is not bookkeeping — `ApplyMode.Pull` resets a field ABSENT from the substrate back to
 * it, and `PersistProvider` pulls every render-scoped (URL) source once on mount. So a factory-phase
 * capture would make the first case below reset the controlled value to the factory default and
 * report that reset to the parent. Every expectation here is the behaviour that predates the split
 * and is deliberately preserved by it.
 */
describe('persist pristine defaults are captured on connect, not in the factory phase', () => {
	it('keeps a controlled field at its controlled value when the URL carries nothing for it', async () => {
		const view = renderWithUrl('', { q: CONTROLLED })
		await act(flush)

		expect(view.instance.q).toBe(CONTROLLED)
		// A capture moved to the factory phase would reset `q` to FACTORY_DEFAULT here and echo that
		// reset upwards — the parent would be told its own controlled value had changed.
		expect(view.onValueChange).not.toHaveBeenCalled()
	})

	it('lets a deep link win over the controlled value', async () => {
		// The provider's mount-time pull is last-arrival-wins, so a URL value present for the field
		// overrides the controlled push. Unchanged by the split, and pinned next to the case above so
		// the two rules are read together.
		const view = renderWithUrl(`q=${DEEP_LINK}`, { q: CONTROLLED })
		await act(flush)

		expect(view.instance.q).toBe(DEEP_LINK)
	})

	it('hydrates an uncontrolled store from its deep link', async () => {
		const view = renderWithUrl(`q=${DEEP_LINK}`)
		await act(flush)

		expect(view.instance.q).toBe(DEEP_LINK)
	})

	it('treats the controlled value as the default clearOnDefault omits', async () => {
		// The other half of what the captured default decides. The controlled value is the baseline, so
		// it is omitted from the URL, and moving off it — even onto the factory default — is a real
		// value that gets written. A factory-phase capture would invert both halves of this test.
		const view = renderWithUrl('', { q: CONTROLLED })
		await act(flush)
		expect(view.fake.getSearch()).toBe('')

		view.instance.q = FACTORY_DEFAULT
		await act(flush)

		expect(view.fake.getSearch()).toBe(`q=${FACTORY_DEFAULT}`)
	})
})
