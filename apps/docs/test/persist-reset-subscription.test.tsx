import { pipe, createContextStore } from '@ez-kit/zu-store'
import { withPersist, persistHandle, PersistProvider } from '@ez-kit/zu-store/persist'
import { patchKeyed } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed } from '@ez-kit/zu-store/persist'

it('saves a Zustand subscription edit to a distinct field during partial reset', async () => {
	const panel = createContextStore(
		() =>
			pipe(
				createStore(() => ({ width: 100, height: 100 })),
				withPersist({
					fields: (field) => [field((s) => s.width, { source: 'test' }), field((s) => s.height, { source: 'test' })],
				}),
			),
		{ name: 'panel' },
	)
	let store!: ReturnType<typeof panel.useStore>
	function Capture() {
		store = panel.useStore()
		return null
	}
	let saved: Keyed = new Map()
	const source = {
		port: {
			get: () => new Map(saved),
			set: (values: Keyed, ctx: CommitCtx) => {
				saved = patchKeyed(saved, values, ctx)
			},
		},
	}
	const view = render(
		<PersistProvider adapters={{ test: source }}>
			<panel.Provider>
				<Capture />
			</panel.Provider>
		</PersistProvider>,
	)
	try {
		const handle = persistHandle(store, 'test')
		await act(async () => {
			store.setState({ width: 400, height: 200 })
			await handle.flush()
		})
		const unsubscribe = store.subscribe((current, previous) => {
			if (previous.width !== 100 && current.width === 100) store.setState({ height: 300 })
		})
		try {
			await act(async () => {
				await handle.reset({ fields: [['width']] })
				await handle.flush()
			})
			expect(store.getState().height).toBe(300)
			expect([...saved.values()]).toEqual(['300'])
		} finally {
			unsubscribe()
		}
	} finally {
		view.unmount()
	}
})
