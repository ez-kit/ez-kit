import { createContextStore, pipe } from '@ez-kit/va-store'
import { PersistProvider, persistHandle, withPersist } from '@ez-kit/va-store/persist'
import { patchKeyed } from '@ez-kit/va-store/persist/storage'
import { act, render } from '@testing-library/react'
import { proxy, subscribe } from 'valtio'
import { expect, it } from 'vitest'

import type { Keyed } from '@ez-kit/va-store/persist'

it('preserves a Valtio subscriber edit to a later field of a full reset', async () => {
	const panel = createContextStore(
		() =>
			pipe(
				proxy({ width: 100, height: 100 }),
				withPersist({ fields: (f) => [f((s) => s.width, { source: 'test' }), f((s) => s.height, { source: 'test' })] }),
			),
		{ name: 'audit' },
	)
	let store!: ReturnType<typeof panel.useStore>
	function Capture() {
		store = panel.useStore()
		return null
	}
	let saved: Keyed = new Map()
	const view = render(
		<PersistProvider
			adapters={{
				test: {
					port: {
						get: () => new Map(saved),
						set: (values, ctx) => {
							saved = patchKeyed(saved, values, ctx)
						},
					},
				},
			}}
		>
			<panel.Provider>
				<Capture />
			</panel.Provider>
		</PersistProvider>,
	)
	const handle = persistHandle(store, 'test')
	let previousWidth = store.width
	const stop = subscribe(
		store,
		() => {
			if (store.width === 100 && previousWidth !== 100) {
				previousWidth = 100
				store.height = 300
			}
			previousWidth = store.width
		},
		true,
	)
	try {
		await act(async () => {
			store.width = 400
			store.height = 200
			await handle.flush()
		})
		await act(async () => {
			await handle.reset()
			await handle.flush()
		})
		expect(store.height).toBe(300)
		expect([...saved.values()]).toEqual(['300'])
	} finally {
		stop()
		view.unmount()
	}
})
