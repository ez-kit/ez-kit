import { createContextStore as vaContext, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createContextStore as zuContext, pipe as zuPipe } from '@ez-kit/zu-store'
import {
	paramArray,
	paramDate,
	persistHandle,
	PersistProvider,
	withPersist as zuPersist,
} from '@ez-kit/zu-store/persist'
import { patchKeyed } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed, ReadCtx } from '@ez-kit/zu-store/persist'

function fixture(manager: 'zustand' | 'valtio') {
	if (manager === 'zustand') {
		const panel = zuContext(
			() =>
				zuPipe(
					createStore(() => ({ dates: [new Date(0)] })),
					zuPersist({ fields: (f) => [f((s) => s.dates, { source: 'api' })] }),
				),
			{ name: 'dates-zu' },
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
			time: () => current.getState().dates[0]?.getTime(),
			set: (time: number) => {
				current.setState({ dates: [new Date(time)] })
			},
			flush: () => persistHandle(current, 'api').flush(),
		}
	}
	const panel = vaContext(
		() => vaPipe(proxy({ dates: [new Date(0)] }), vaPersist({ fields: (f) => [f((s) => s.dates, { source: 'api' })] })),
		{ name: 'dates-va' },
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
		time: () => current.dates[0]?.getTime(),
		set: (time: number) => {
			current.dates = [new Date(time)]
		},
		flush: () => persistHandle(current, 'api').flush(),
	}
}

describe('semantic array codecs through public manager bindings', () => {
	it.each(['zustand', 'valtio'] as const)(
		'%s restores Date arrays and removes an override at semantic default',
		async (manager) => {
			const target = fixture(manager)
			let saved: Keyed = new Map()
			const get = (context?: ReadCtx) => {
				saved = new Map(
					[...(context?.addresses.keys() ?? [])].map((key) => [
						key,
						paramArray(paramDate()).stringify([new Date(1000)]) ?? '',
					]),
				)
				return new Map(saved)
			}
			const set = (desired: Keyed, context: CommitCtx) => {
				saved = patchKeyed(saved, desired, context)
			}
			render(<PersistProvider adapters={{ api: { port: { get, set } } }}>{target.content}</PersistProvider>)
			expect(target.time()).toBe(1000)
			await act(async () => {
				target.set(2000)
				await target.flush()
			})
			expect(saved.size).toBe(1)
			await act(async () => {
				target.set(0)
				await target.flush()
			})
			expect(target.time()).toBe(0)
			expect(saved.size).toBe(0)
		},
	)
})
