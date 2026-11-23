import { createContextStore as vaContext, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createContextStore as zuContext, pipe as zuPipe } from '@ez-kit/zu-store'
import { PersistProvider, persistHandle, withPersist as zuPersist } from '@ez-kit/zu-store/persist'
import { act, render } from '@testing-library/react'
import { useEffect, useLayoutEffect } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { Keyed, ReadCtx } from '@ez-kit/zu-store/persist'

function fixture(manager: 'zustand' | 'valtio', kind: 'layout' | 'passive') {
	const useMount = kind === 'layout' ? useLayoutEffect : useEffect
	if (manager === 'zustand') {
		const panel = zuContext(
			() =>
				zuPipe(
					createStore(() => ({ width: 320 })),
					zuPersist({ fields: (f) => [f((s) => s.width, { source: 'api' })] }),
				),
			{ name: 'early-zu' },
		)
		let current!: ReturnType<typeof panel.useStore>
		function Child() {
			const store = panel.useStore()
			current = store
			useMount(() => {
				store.setState({ width: 500 })
			}, [store])
			return null
		}
		return {
			content: (
				<panel.Provider>
					<Child />
				</panel.Provider>
			),
			width: () => current.getState().width,
			flush: () => persistHandle(current, 'api').flush(),
		}
	}
	const panel = vaContext(
		() => vaPipe(proxy({ width: 320 }), vaPersist({ fields: (f) => [f((s) => s.width, { source: 'api' })] })),
		{ name: 'early-va' },
	)
	let current!: ReturnType<typeof panel.useStore>
	function Child() {
		const store = panel.useStore()
		current = store
		useMount(() => {
			store.width = 500
		}, [store])
		return null
	}
	return {
		content: (
			<panel.Provider>
				<Child />
			</panel.Provider>
		),
		width: () => current.width,
		flush: () => persistHandle(current, 'api').flush(),
	}
}

describe('public mount edits before persistence connection', () => {
	for (const manager of ['zustand', 'valtio'] as const)
		for (const kind of ['layout', 'passive'] as const)
			it.each(['sync', 'async'] as const)(
				`${manager} preserves and saves ${kind} edits with %s restore`,
				async (readMode) => {
					const target = fixture(manager, kind)
					let saved: Keyed = new Map()
					let finishRead: ((values: Keyed) => void) | undefined
					let initial: Keyed = new Map()
					const get = vi.fn((context?: ReadCtx) => {
						initial = new Map([...(context?.addresses.keys() ?? [])].map((key) => [key, '700']))
						if (readMode === 'sync') return initial
						return new Promise<Keyed>((resolve) => {
							finishRead = resolve
						})
					})
					const set = vi.fn((desired: Keyed) => {
						saved = new Map(desired)
					})
					render(<PersistProvider adapters={{ api: { port: { get, set } } }}>{target.content}</PersistProvider>)
					expect(target.width()).toBe(500)
					await act(async () => {
						finishRead?.(initial)
						await target.flush()
					})
					expect(target.width()).toBe(500)
					expect([...saved.values()]).toEqual(['500'])
					expect(set).toHaveBeenCalled()
					expect(get).toHaveBeenCalledTimes(1)
				},
			)
})
