import { createContextStore as vaContext, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createContextStore as zuContext, pipe as zuPipe } from '@ez-kit/zu-store'
import { paramJson, persistHandle, PersistProvider, withPersist as zuPersist } from '@ez-kit/zu-store/persist'
import { patchKeyed } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'
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
			reset: () => persistHandle(current, 'api').reset(),
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
		reset: () => persistHandle(current, 'api').reset(),
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
	return { port, values: () => [...saved.values()], saved: () => saved }
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

function amount(n: number) {
	const value = { n }
	Object.defineProperty(value, 'toJSON', {
		value(this: { n: number }) {
			return this.n
		},
	})
	return value
}
class NestedAmount {
	constructor(public cents: number) {}
	toJSON() {
		return this.cents
	}
}

describe('custom serialized defaults through public bindings', () => {
	for (const manager of ['zustand', 'valtio'] as const) {
		it(`${manager} preserves non-enumerable toJSON for restore, clear and reset`, async () => {
			const validate = vi.fn((raw: unknown) => amount(Number(raw)))
			const backend = source(amount(1))
			const target = fixture(manager, amount(0), validate)
			const view = render(
				<PersistProvider adapters={{ api: { port: backend.port } }}>{target.content}</PersistProvider>,
			)
			expect(target.get().n).toBe(1)
			expect(validate).toHaveBeenCalledTimes(1)
			await act(async () => {
				target.set(amount(2))
				await target.flush()
			})
			expect([...backend.saved().values()]).toEqual(['2'])
			await act(async () => {
				target.set(amount(0))
				await target.flush()
			})
			expect(backend.saved().size).toBe(0)
			await act(async () => {
				target.set(amount(3))
				await target.flush()
				await target.reset()
			})
			expect(target.get().n).toBe(0)
			expect(backend.saved().size).toBe(0)
			expect(validate).toHaveBeenCalledTimes(1)
			view.unmount()
		})
		it(`${manager} preserves a nested data serializer without sharing reset data`, async () => {
			const initial = { amount: new NestedAmount(0) }
			const backend = source({ amount: new NestedAmount(1) })
			const target = fixture(manager, initial, (raw) => ({
				amount: new NestedAmount((raw as { amount: number }).amount),
			}))
			const view = render(
				<PersistProvider adapters={{ api: { port: backend.port } }}>{target.content}</PersistProvider>,
			)
			expect(target.get().amount.cents).toBe(1)
			await act(async () => {
				target.set({ amount: new NestedAmount(2) })
				await target.flush()
			})
			expect([...backend.saved().values()]).toEqual(['{"amount":2}'])
			await act(async () => {
				await target.reset()
			})
			expect(target.get().amount).not.toBe(initial.amount)
			expect(target.get().amount.toJSON()).toBe(0)
			expect(backend.saved().size).toBe(0)
			view.unmount()
		})
	}
})
