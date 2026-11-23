import { createContextStore as vaContext, pipe as vaPipe } from '@ez-kit/va-store'
import { SourceMutationCancelledError as VaCancelled, withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createContextStore as zuContext, pipe as zuPipe } from '@ez-kit/zu-store'
import {
	persistHandle,
	PersistProvider,
	SourceMutationCancelledError as ZuCancelled,
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
					createStore(() => ({ width: 0 })),
					zuPersist({ restore: { externalChanges: 'apply' }, fields: (f) => [f((s) => s.width, { source: 'api' })] }),
				),
			{ name: 'cancel-zu' },
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
			width: () => current.getState().width,
			set: (width: number) => {
				current.setState({ width })
			},
			handle: () => persistHandle(current, 'api'),
			Cancelled: ZuCancelled,
		}
	}
	const panel = vaContext(
		() =>
			vaPipe(
				proxy({ width: 0 }),
				vaPersist({ restore: { externalChanges: 'apply' }, fields: (f) => [f((s) => s.width, { source: 'api' })] }),
			),
		{ name: 'cancel-va' },
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
		width: () => current.width,
		set: (width: number) => {
			current.width = width
		},
		handle: () => persistHandle(current, 'api'),
		Cancelled: VaCancelled,
	}
}

describe('custom source proven cancellation through public binding entries', () => {
	it.each(['zustand', 'valtio'] as const)(
		'%s reconciles a guaranteed non-commit and can save a later edit',
		async (manager) => {
			const target = fixture(manager)
			let saved: Keyed | undefined
			let cancel = true
			const failure = new target.Cancelled('request cancelled before commit')
			const port = {
				get(context?: ReadCtx): Keyed {
					saved ??= new Map([...(context?.addresses.keys() ?? [])].map((key) => [key, '100']))
					return new Map(saved)
				},
				set(desired: Keyed, context: CommitCtx) {
					if (cancel) return Promise.reject(failure)
					saved = patchKeyed(saved ?? new Map<string, string>(), desired, context)
					return Promise.resolve()
				},
			}
			const view = render(<PersistProvider adapters={{ api: { port } }}>{target.content}</PersistProvider>)
			expect(target.width()).toBe(100)
			await act(async () => {
				target.set(200)
				await expect(target.handle().flush()).rejects.toBe(failure)
			})
			expect(target.width()).toBe(100)
			expect(target.handle().getStatus().dirty).toBe(false)
			expect(failure).toBeInstanceOf(ZuCancelled)
			expect(failure).toBeInstanceOf(VaCancelled)
			cancel = false
			await act(async () => {
				target.set(300)
				await target.handle().flush()
			})
			expect([...(saved?.values() ?? [])]).toEqual(['300'])
			view.unmount()
		},
	)
})
