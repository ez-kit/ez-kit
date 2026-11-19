import { createContextStore as vaContext, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { persistLocalStorage as vaField } from '@ez-kit/va-store/persist/storage'
import { createContextStore as zuContext, pipe as zuPipe } from '@ez-kit/zu-store'
import { persistHandle, PersistProvider, withPersist as zuPersist } from '@ez-kit/zu-store/persist'
import { patchKeyed, persistLocalStorage as zuField } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed } from '@ez-kit/zu-store/persist'
class ZuState {
	@zuField({ source: 'c' }) 'a::b' = 0
	@zuField({ source: 'b::c' }) a = 0
}
class VaState {
	@vaField({ source: 'c' }) 'a::b' = 0
	@vaField({ source: 'b::c' }) a = 0
}
function source() {
	let saved: Keyed = new Map()
	return {
		port: {
			get: () => new Map(saved),
			set(desired: Keyed, ctx: CommitCtx) {
				saved = patchKeyed(saved, desired, ctx)
			},
		},
		values: () => [...saved.values()],
	}
}
function fixture(manager: 'zustand' | 'valtio') {
	if (manager === 'zustand') {
		const panel = zuContext(
			() =>
				zuPipe(
					createStore(() => new ZuState()),
					zuPersist(),
				),
			{ name: 'tuples-zu' },
		)
		let current!: ReturnType<typeof panel.useStore>
		function Capture() {
			current = panel.useStore()
			return null
		}
		return {
			content: (
				<panel.Provider>
					<Capture />
				</panel.Provider>
			),
			edit: () => {
				current.setState({ 'a::b': 1, a: 2 })
			},
			flush: () => Promise.all([persistHandle(current, 'c').flush(), persistHandle(current, 'b::c').flush()]),
			reset: () => persistHandle(current, 'b::c').reset(),
			values: () => current.getState(),
		}
	}
	const panel = vaContext(() => vaPipe(proxy(new VaState()), vaPersist()), { name: 'tuples-va' })
	let current!: ReturnType<typeof panel.useStore>
	function Capture() {
		current = panel.useStore()
		return null
	}
	return {
		content: (
			<panel.Provider>
				<Capture />
			</panel.Provider>
		),
		edit: () => {
			current['a::b'] = 1
			current.a = 2
		},
		flush: () => Promise.all([persistHandle(current, 'c').flush(), persistHandle(current, 'b::c').flush()]),
		reset: () => persistHandle(current, 'b::c').reset(),
		values: () => current,
	}
}
describe('decorated property/source identities through public binding fronts', () => {
	it.each(['zustand', 'valtio'] as const)(
		'%s persists both delimiter-containing tuples independently',
		async (manager) => {
			const target = fixture(manager),
				first = source(),
				second = source()
			render(
				<PersistProvider adapters={{ c: { port: first.port }, 'b::c': { port: second.port } }}>
					{target.content}
				</PersistProvider>,
			)
			await act(async () => {
				target.edit()
				await target.flush()
			})
			expect(first.values()).toEqual(['1'])
			expect(second.values()).toEqual(['2'])
			await act(async () => {
				await target.reset()
			})
			expect(target.values()['a::b']).toBe(1)
			expect(target.values().a).toBe(0)
			expect(first.values()).toEqual(['1'])
			expect(second.values()).toEqual([])
		},
	)
})
