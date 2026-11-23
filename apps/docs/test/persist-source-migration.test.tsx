import { createContextStore, pipe } from '@ez-kit/zu-store'
import { withPersist, PersistProvider, encodeRecord, decodeRecord, persistHandle } from '@ez-kit/zu-store/persist'
import { patchKeyed } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed, ReadCtx } from '@ez-kit/zu-store/persist'

it.each([
	{ edit: undefined, expected: '701' },
	{ edit: 800, expected: '800' },
])('keeps the source migration local or saves a newer edit (edit=$edit)', async ({ edit, expected }) => {
	const panel = createContextStore(
		() =>
			pipe(
				createStore(() => ({ width: 0 })),
				withPersist({
					throttleMs: 60_000,
					fields: (f) => [
						f((s) => s.width, { source: 'a' }),
						f((s) => s.width, { source: 'b', schema: { version: 1, migrate: (v) => Number(v) + 1 } }),
					],
				}),
			),
		{ name: 'shared-source' },
	)
	let state!: ReturnType<typeof panel.useStore>
	function Read() {
		state = panel.useStore()
		return null
	}
	let saved: Keyed | undefined
	const a = {
		port: {
			get(context?: ReadCtx) {
				return new Map([...(context?.addresses.keys() ?? [])].map((key) => [key, '500']))
			},
			set() {},
		},
	}
	const b = {
		port: {
			capabilities: { recordVersions: true },
			get(context?: ReadCtx) {
				saved ??= new Map([...(context?.addresses.keys() ?? [])].map((key) => [key, encodeRecord('700', 0)]))
				return new Map(saved)
			},
			set(desired: Keyed, context: CommitCtx) {
				saved = patchKeyed(saved ?? new Map<string, string>(), desired, context)
			},
		},
	}
	const view = render(
		<PersistProvider adapters={{ a, b }}>
			<panel.Provider>
				<Read />
			</panel.Provider>
		</PersistProvider>,
	)
	try {
		expect(state.getState().width).toBe(500)
		await act(async () => {
			if (edit !== undefined) state.setState({ width: edit })
			await persistHandle(state, 'b').flush()
		})
		expect(state.getState().width).toBe(edit ?? 500)
		expect([...(saved?.values() ?? [])].map((raw) => decodeRecord(raw))).toEqual([{ version: 1, value: expected }])
	} finally {
		view.unmount()
	}
})
