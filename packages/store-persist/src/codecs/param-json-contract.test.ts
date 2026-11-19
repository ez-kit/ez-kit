import { describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from '../binding'
import { createPersistEngine } from '../engine'
import { patchKeyed } from '../storage/patch'
import { objectPort, observable } from '../test-kit'

import { canonicalStringify } from './canonical'
import { paramJson } from './param-json'

import type { CommitCtx, Keyed } from '../types'

const json = paramJson<unknown>()
const equal = (a: unknown, b: unknown) => json.equals?.(a, b)

function bindingKey(binding: ReturnType<typeof createBinding>): string {
	const key = binding.keyOf.values().next().value
	if (key === undefined) throw new Error('Missing test binding key')
	return key
}

describe('JSON equality follows serialized values', () => {
	it('compares Date timestamps and their JSON representations', () => {
		expect(equal(new Date(1000), new Date(1000))).toBe(true)
		expect(equal(new Date(1000), new Date(2000))).toBe(false)
		expect(equal(new Date(1000), new Date(1000).toJSON())).toBe(true)
		expect(equal({ date: new Date(1000) }, { date: new Date(2000) })).toBe(false)
	})

	it('honors toJSON once with its native property-key context', () => {
		const toJSON = vi.fn((key: string) => ({ key, b: 2, a: 1 }))
		expect(equal({ nested: { toJSON } }, { nested: { a: 1, b: 2, key: 'nested' } })).toBe(true)
		expect(toJSON).toHaveBeenCalledExactlyOnceWith('nested')
	})

	it('normalizes object keys recursively inside arrays without reordering array values', () => {
		expect(equal([{ b: { y: 2, x: 1 }, a: 0 }], [{ a: 0, b: { x: 1, y: 2 } }])).toBe(true)
		expect(equal([{ a: 1 }, { a: 2 }], [{ a: 2 }, { a: 1 }])).toBe(false)
	})

	it('preserves own special keys instead of changing the canonical object prototype', () => {
		const first: unknown = JSON.parse('{"__proto__":{"x":1},"constructor":2,"prototype":3}')
		const changed: unknown = JSON.parse('{"__proto__":{"x":2},"constructor":2,"prototype":3}')
		const reordered: unknown = JSON.parse('{"prototype":3,"constructor":2,"__proto__":{"x":1}}')
		expect(equal(first, changed)).toBe(false)
		expect(equal(first, reordered)).toBe(true)
		expect(canonicalStringify(first)).toBe('{"__proto__":{"x":1},"constructor":2,"prototype":3}')
		expect(Object.prototype).not.toHaveProperty('x')
	})

	it('preserves native JSON omission and array-null normalization', () => {
		expect(equal({ missing: undefined, kept: true }, { kept: true })).toBe(true)
		expect(equal([undefined, NaN, Infinity], [null, null, null])).toBe(true)
		expect(canonicalStringify(undefined)).toBeUndefined()
		expect(canonicalStringify(() => undefined)).toBeUndefined()
	})

	it('does not mutate the serialized object or its nested arrays', () => {
		const value = Object.freeze({ z: Object.freeze([Object.freeze({ b: 2, a: 1 })]), a: 0 })
		expect(equal(value, { a: 0, z: [{ a: 1, b: 2 }] })).toBe(true)
		expect(Object.keys(value)).toEqual(['z', 'a'])
		expect(Object.keys(value.z[0] ?? {})).toEqual(['b', 'a'])
	})

	it('preserves native serialization failures', () => {
		const cycle: { self?: unknown } = {}
		cycle.self = cycle
		expect(() => equal(cycle, {})).toThrow(TypeError)
		expect(() => equal(1n, 1)).toThrow(TypeError)
		const failure = new Error('toJSON failed')
		expect(() =>
			equal(
				{
					toJSON: () => {
						throw failure
					},
				},
				{},
			),
		).toThrow(failure)
	})
})

describe('JSON semantic equality preserves actual persistence', () => {
	it('saves validated Date edits and removes only a return to the original timestamp', async () => {
		const initial = new Date(1000)
		const state = observable({ value: new Date(0) })
		const binding = createBinding(
			state,
			objectPort,
			[
				{
					path: ['value'],
					parser: paramJson<unknown>(),
					schema: {
						validate: (value) => {
							if (typeof value !== 'string') throw new Error('Expected an ISO date')
							return new Date(value)
						},
					},
				},
			],
			{},
		)
		captureDefaults(binding)
		addressBinding(binding, { path: [], name: 'date', id: 'one' })
		const key = bindingKey(binding)
		let saved: Keyed = new Map([[key, JSON.stringify(initial)]])
		const engine = createPersistEngine({
			get: () => new Map(saved),
			set: (desired: Keyed, context: CommitCtx) => {
				saved = patchKeyed(saved, desired, context)
			},
		})
		try {
			engine.connect(binding)
			expect(state.value.getTime()).toBe(1000)
			state.value = new Date(2000)
			await engine.flush(binding)
			expect(saved.get(key)).toBe(JSON.stringify(new Date(2000)))
			state.value = new Date(0)
			await engine.flush(binding)
			expect(saved.has(key)).toBe(false)
		} finally {
			engine.dispose()
		}
	})

	it('saves changes to own __proto__ values and clears only their original JSON data', async () => {
		const first = JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>
		const changed = JSON.parse('{"__proto__":{"x":2}}') as Record<string, unknown>
		const state = observable({ value: first })
		const binding = createBinding(state, objectPort, [{ path: ['value'], parser: paramJson<unknown>() }], {})
		captureDefaults(binding)
		addressBinding(binding, { path: [], name: 'special-key', id: 'one' })
		const key = bindingKey(binding)
		let saved: Keyed = new Map()
		const engine = createPersistEngine({
			get: () => new Map(saved),
			set: (desired: Keyed, context: CommitCtx) => {
				saved = patchKeyed(saved, desired, context)
			},
		})
		try {
			engine.connect(binding)
			state.value = changed
			await engine.flush(binding)
			expect(saved.get(key)).toBe(JSON.stringify(changed))
			state.value = JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>
			await engine.flush(binding)
			expect(saved.has(key)).toBe(false)
		} finally {
			engine.dispose()
		}
	})
})
