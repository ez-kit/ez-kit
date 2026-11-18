import { createStoreCache as vaCache, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createStoreCache as zuCache, pipe as zuPipe } from '@ez-kit/zu-store'
import { persistHandle, PersistProvider, withPersist as zuPersist } from '@ez-kit/zu-store/persist'
import { patchKeyed } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { Fragment, StrictMode } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed } from '@ez-kit/zu-store/persist'
function fixture(manager: 'zustand' | 'valtio') {
	if (manager === 'zustand') {
		const cache = zuCache({ gcTime: Infinity })
		const panel = cache.createCachedStore(
			() =>
				zuPipe(
					createStore(() => ({ width: 320 })),
					zuPersist({ fields: (f) => [f((s) => s.width, { source: 'api' })] }),
				),
			{ name: 'owner-zu' },
		)
		let current!: ReturnType<typeof panel.useStore>
		function Capture() {
			current = panel.useStore()
			return null
		}
		return {
			content: (
				<cache.Provider>
					<panel.Provider id='one'>
						<Capture />
					</panel.Provider>
				</cache.Provider>
			),
			current: () => current,
			width: () => current.getState().width,
			set: (value: number) => {
				current.setState({ width: value })
			},
			flush: () => persistHandle(current, 'api').flush(),
			editOld: () => {
				const old = current
				return () => {
					old.setState({ width: 700 })
				}
			},
		}
	}
	const cache = vaCache({ gcTime: Infinity })
	const panel = cache.createCachedStore(
		() => vaPipe(proxy({ width: 320 }), vaPersist({ fields: (f) => [f((s) => s.width, { source: 'api' })] })),
		{ name: 'owner-va' },
	)
	let current!: ReturnType<typeof panel.useStore>
	function Capture() {
		current = panel.useStore()
		return null
	}
	return {
		content: (
			<cache.Provider>
				<panel.Provider id='one'>
					<Capture />
				</panel.Provider>
			</cache.Provider>
		),
		current: () => current,
		width: () => current.width,
		set: (value: number) => {
			current.width = value
		},
		flush: () => persistHandle(current, 'api').flush(),
		editOld: () => {
			const old = current
			return () => {
				old.width = 700
			}
		},
	}
}
describe('cache container ownership beneath a retained persistence registry', () => {
	for (const manager of ['zustand', 'valtio'] as const)
		it.each([false, true])(
			`${manager} releases infinite keepalive on genuine container removal (StrictMode=%s)`,
			async (strict) => {
				const target = fixture(manager)
				let saved: Keyed = new Map()
				const get = vi.fn(() => new Map(saved))
				const set = vi.fn((desired: Keyed, context: CommitCtx) => {
					saved = patchKeyed(saved, desired, context)
				})
				const adapters = { api: { port: { get, set } } }
				const Mode = strict ? StrictMode : Fragment
				const tree = (visible: boolean) => (
					<Mode>
						<PersistProvider adapters={adapters}>{visible ? target.content : null}</PersistProvider>
					</Mode>
				)
				const view = render(tree(true))
				const first = target.current()
				const editOld = target.editOld()
				expect(get).toHaveBeenCalledTimes(1)
				await act(async () => {
					target.set(500)
					await target.flush()
				})
				view.rerender(tree(false))
				await act(async () => {
					await Promise.resolve()
				})
				expect(() => {
					view.rerender(tree(true))
				}).not.toThrow()
				expect(target.current()).not.toBe(first)
				expect(target.width()).toBe(500)
				expect(get).toHaveBeenCalledTimes(2)
				const writes = set.mock.calls.length
				await act(async () => {
					editOld()
					await Promise.resolve()
				})
				expect(set).toHaveBeenCalledTimes(writes)
				await act(async () => {
					target.set(600)
					await target.flush()
				})
				expect([...saved.values()]).toEqual(['600'])
			},
		)
})
