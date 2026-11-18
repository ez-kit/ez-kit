import { createContextStore as vaContext, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createContextStore as zuContext, pipe as zuPipe } from '@ez-kit/zu-store'
import { paramJson, persistHandle, PersistProvider, withPersist as zuPersist } from '@ez-kit/zu-store/persist'
import { patchKeyed } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed, ReadCtx } from '@ez-kit/zu-store/persist'

function fixture<T extends object>(manager: 'zustand' | 'valtio', initial: T, validate: (value: unknown) => T) {
	if (manager === 'zustand') {
		const panel = zuContext(
			() =>
				zuPipe(
					createStore(() => ({ value: initial })),
					zuPersist({
						fields: (f) => [f((s) => s.value, { source: 'api', parser: paramJson<unknown>(), schema: { validate } })],
					}),
				),
			{ name: 'json-zu' },
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
			get: () => current.getState().value,
			set: (value: T) => {
				current.setState({ value })
			},
			flush: () => persistHandle(current, 'api').flush(),
		}
	}
	const panel = vaContext(
		() =>
			vaPipe(
				proxy({ value: initial }),
				vaPersist({
					fields: (f) => [f((s) => s.value, { source: 'api', parser: paramJson<unknown>(), schema: { validate } })],
				}),
			),
		{ name: 'json-va' },
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
		get: () => current.value,
		set: (value: T) => {
			current.value = value
		},
		flush: () => persistHandle(current, 'api').flush(),
	}
}
function source(initial: object) {
	let saved: Keyed = new Map()
	const port = {
		get(context?: ReadCtx) {
			saved = new Map([...(context?.addresses.keys() ?? [])].map((key) => [key, JSON.stringify(initial)]))
			return new Map(saved)
		},
		set(desired: Keyed, context: CommitCtx) {
			saved = patchKeyed(saved, desired, context)
		},
	}
	return { port, values: () => [...saved.values()] }
}
function jsonObject(text: string): Record<string, unknown> {
	return JSON.parse(text) as Record<string, unknown>
}

describe('JSON equality through public persistence bindings', () => {
	it.each(['zustand', 'valtio'] as const)(
		'%s saves validated Date changes and removes only the true default',
		async (manager) => {
			const validate = (value: unknown) => {
				if (typeof value !== 'string') throw new Error('Expected ISO string')
				return new Date(value)
			}
			const target = fixture(manager, new Date(0), validate)
			const backend = source(new Date(1000))
			render(<PersistProvider adapters={{ api: { port: backend.port } }}>{target.content}</PersistProvider>)
			expect(target.get().getTime()).toBe(1000)
			await act(async () => {
				target.set(new Date(2000))
				await target.flush()
			})
			expect(backend.values()).toEqual([JSON.stringify(new Date(2000))])
			await act(async () => {
				target.set(new Date(0))
				await target.flush()
			})
			expect(backend.values()).toEqual([])
		},
	)
	it.each(['zustand', 'valtio'] as const)(
		'%s retains special own JSON keys when deciding whether an override changed',
		async (manager) => {
			const original = jsonObject('{"__proto__":{"x":0},"constructor":"original"}')
			const incoming = jsonObject('{"__proto__":{"x":1},"constructor":"original"}')
			const changed = jsonObject('{"__proto__":{"x":2},"constructor":"original"}')
			const target = fixture(manager, original, (value) => value as Record<string, unknown>)
			const backend = source(incoming)
			render(<PersistProvider adapters={{ api: { port: backend.port } }}>{target.content}</PersistProvider>)
			expect(target.get()).toEqual(incoming)
			await act(async () => {
				target.set(changed)
				await target.flush()
			})
			expect(backend.values().map((value) => JSON.parse(value) as unknown)).toEqual([changed])
			await act(async () => {
				target.set(original)
				await target.flush()
			})
			expect(backend.values()).toEqual([])
		},
	)
})
