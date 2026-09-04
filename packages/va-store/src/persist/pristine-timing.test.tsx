import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

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
 * the only configuration in which the timing of the binding's pristine-default capture is
 * observable, because it is the only one where the value the factory produced and the value the
 * first render shows differ.
 */
const filtersStore = createContextStore<Filters, { q?: string }>(({ defaultValue }: ContextStoreInit<{ q?: string }>) =>
	withPersist(proxy<Filters>({ q: defaultValue.q ?? FACTORY_DEFAULT }), {
		fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
	}),
)

function renderWithUrl(search: string, value?: Partial<Filters>) {
	const fake = createFakePersistAdapter(search)
	let instance!: Filters
	function Probe(): null {
		instance = filtersStore.useStore()
		return null
	}

	render(
		<StoreProvider persist={[fake.adapter]}>
			<filtersStore.Provider
				defaultValue={{}}
				{...(value ? { value } : {})}
			>
				<Probe />
			</filtersStore.Provider>
		</StoreProvider>,
	)

	return {
		fake,
		get instance() {
			return instance
		},
	}
}

/**
 * Pins WHEN a persist binding captures each field's pristine default, and what that decides.
 *
 * `withPersist` builds its bindings in the factory phase, so a default is the value the FACTORY
 * produced — captured before `createContextStore`'s Provider pushes the initial controlled `value`
 * during the first render. Bindings used to be built inside the plugin's `setup`, which runs on
 * mount, i.e. AFTER that push, so a controlled field's "default" used to be the controlled value
 * itself. This file exists so that flip cannot happen again unobserved.
 *
 * The default is not merely bookkeeping: `ApplyMode.Pull` resets a field ABSENT from the substrate
 * back to it, and `PersistProvider` pulls every render-scoped (URL) source once on mount. That is
 * why the first case below reads the way it does.
 */
describe('persist pristine defaults are captured in the factory phase', () => {
	it('resets a controlled field to the FACTORY default when the URL carries no value for it', async () => {
		// Was: `q` stayed CONTROLLED, because CONTROLLED was itself the captured default, so the
		// provider's mount-time pull reset the field to the value it already held.
		const view = renderWithUrl('', { q: CONTROLLED })
		await act(flush)

		expect(view.instance.q).toBe(FACTORY_DEFAULT)
	})

	it('leaves an uncontrolled store hydrating from its deep link, exactly as before', async () => {
		// The control case: with no controlled push, the factory value IS what the first render
		// shows, the two capture points agree, and the timing change is invisible.
		const view = renderWithUrl(`q=${DEEP_LINK}`)
		await act(flush)

		expect(view.instance.q).toBe(DEEP_LINK)
	})

	it('lets a URL value win over a controlled one, as it did before the capture moved', async () => {
		// Unchanged, and worth pinning next to the case above: the provider's mount-time pull is
		// last-arrival-wins, so a URL value present for the field overrides the controlled push
		// regardless of which value the binding recorded as its default.
		const view = renderWithUrl(`q=${DEEP_LINK}`, { q: CONTROLLED })
		await act(flush)

		expect(view.instance.q).toBe(DEEP_LINK)
	})
})
