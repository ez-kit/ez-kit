import { describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, cloneDefault, createBinding } from './binding'
import { paramJson } from './codecs'
import { createPersistEngine } from './engine'
import { patchKeyed } from './storage/patch'
import { objectPort, observable } from './test-kit'

import type { CommitCtx, Keyed } from './types'

function amount(n: number): { n: number } {
	return Object.defineProperty({ n }, 'toJSON', {
		value(this: { n: number }) {
			return this.n
		},
	})
}

class Amount {
	constructor(public n: number) {}
	toJSON() {
		return this.n
	}
}

function fixture<T extends object>(initial: T, saved: string | undefined, validate: (value: unknown) => T) {
	const state = observable({ value: initial })
	const binding = createBinding(
		state,
		objectPort,
		[{ path: ['value'], parser: paramJson<unknown>(), schema: { validate } }],
		{},
	)
	captureDefaults(binding)
	addressBinding(binding, { path: [], name: 'snapshot', id: 'one' })
	const key = binding.keyOf.values().next().value
	if (key === undefined) throw new Error('Missing test key')
	let values: Keyed = saved === undefined ? new Map<string, string>() : new Map([[key, saved]])
	const set = vi.fn((desired: Keyed, context: CommitCtx) => {
		values = patchKeyed(values, desired, context)
	})
	const engine = createPersistEngine({ get: () => new Map(values), set })
	engine.connect(binding)
	return { state, binding, engine, set, saved: () => values.get(key) }
}

describe('serializer-preserving default snapshots', () => {
	it('restores a validated plain value with non-enumerable toJSON and clears a return to default', async () => {
		const validate = vi.fn((value: unknown) => amount(Number(value)))
		const app = fixture(amount(0), '1', validate)
		try {
			expect(app.state.value.n).toBe(1)
			expect(validate).toHaveBeenCalledExactlyOnceWith(1)
			app.state.value = amount(2)
			await app.engine.flush(app.binding)
			expect(app.saved()).toBe('2')
			app.state.value = amount(0)
			await app.engine.flush(app.binding)
			expect(app.saved()).toBeUndefined()
		} finally {
			app.engine.dispose()
		}
	})

	it('repeated reset restores the original serializer and never aliases the captured default', async () => {
		const app = fixture(amount(0), '1', (value) => amount(Number(value)))
		try {
			await app.engine.reset(app.binding)
			expect(JSON.stringify(app.state.value)).toBe('0')
			expect(Object.getOwnPropertyDescriptor(app.state.value, 'toJSON')?.enumerable).toBe(false)
			app.state.value.n = 5
			await app.engine.reset(app.binding)
			expect(app.state.value.n).toBe(0)
			expect(JSON.stringify(app.state.value)).toBe('0')
			expect(app.saved()).toBeUndefined()
		} finally {
			app.engine.dispose()
		}
	})

	it('external absence restores a fresh default with its serializer intact', async () => {
		const app = fixture(amount(0), '1', (value) => amount(Number(value)))
		try {
			app.engine.pull(new Map())
			expect(JSON.stringify(app.state.value)).toBe('0')
			app.state.value.n = 8
			await app.engine.flush(app.binding)
			app.engine.pull(new Map())
			expect(app.state.value.n).toBe(0)
			expect(JSON.stringify(app.state.value)).toBe('0')
		} finally {
			app.engine.dispose()
		}
	})

	it('retains nested data prototypes and their toJSON methods in a plain leaf', async () => {
		const app = fixture({ amount: new Amount(0) }, '{"amount":1}', (value) => ({
			amount: new Amount(Number((value as { amount: unknown }).amount)),
		}))
		try {
			expect(app.state.value.amount.n).toBe(1)
			await app.engine.reset(app.binding)
			expect(app.state.value.amount).toBeInstanceOf(Amount)
			expect(JSON.stringify(app.state.value)).toBe('{"amount":0}')
			app.state.value.amount.n = 10
			await app.engine.reset(app.binding)
			expect(app.state.value.amount.n).toBe(0)
			app.state.value = { amount: new Amount(3) }
			await app.engine.flush(app.binding)
			expect(app.saved()).toBe('{"amount":3}')
			app.state.value = { amount: new Amount(0) }
			await app.engine.flush(app.binding)
			expect(app.saved()).toBeUndefined()
		} finally {
			app.engine.dispose()
		}
	})

	it('does not run storage validation against application defaults or reset snapshots', async () => {
		const validate = vi.fn((): { n: number } => {
			throw new Error('The empty application default is not valid stored input')
		})
		const app = fixture(amount(0), undefined, validate)
		try {
			await app.engine.reset(app.binding)
			expect(validate).not.toHaveBeenCalled()
			expect(JSON.stringify(app.state.value)).toBe('0')
		} finally {
			app.engine.dispose()
		}
	})

	it('snapshots a cyclic data graph when toJSON gives it a valid scalar representation', async () => {
		function cyclicAmount(n: number) {
			const value = amount(n) as { n: number; self?: unknown }
			value.self = value
			return value
		}
		const snapshot = cloneDefault(cyclicAmount(0)) as { self: unknown }
		expect(snapshot.self).toBe(snapshot)
		const app = fixture(cyclicAmount(0), '1', (value) => cyclicAmount(Number(value)))
		try {
			expect(app.state.value.n).toBe(1)
			await app.engine.reset(app.binding)
			expect(app.state.value.n).toBe(0)
			expect(JSON.stringify(app.state.value)).toBe('0')
		} finally {
			app.engine.dispose()
		}
	})

	it('rejects a serializer with opaque private slots before source I/O can discard saved data', () => {
		class OpaqueAmount {
			#n = 0
			toJSON() {
				return this.#n
			}
		}
		const read = vi.fn(() => new Map<string, string>())
		expect(() => {
			const state = observable({ value: { amount: new OpaqueAmount() } })
			const binding = createBinding(state, objectPort, [{ path: ['value'], parser: paramJson<unknown>() }], {})
			createPersistEngine({ get: read, set: vi.fn() }).connect(binding)
		}).toThrow('Cannot snapshot default for "value"')
		expect(read).not.toHaveBeenCalled()
	})

	it('permits a corrected default capture after rejecting an unsnappable value', async () => {
		class OpaqueAmount {
			#n = 0
			toJSON() {
				return this.#n
			}
		}
		const state = observable<{ value: unknown }>({ value: amount(0) })
		const binding = createBinding(state, objectPort, [{ path: ['value'], parser: paramJson<unknown>() }], {})
		state.value = { amount: new OpaqueAmount() }
		expect(() => {
			captureDefaults(binding)
		}).toThrow('Cannot snapshot default for "value"')
		state.value = amount(4)
		captureDefaults(binding)
		const engine = createPersistEngine({ get: () => new Map(), set: () => undefined })
		engine.connect(binding)
		try {
			state.value = amount(7)
			await engine.reset(binding)
			expect(JSON.stringify(state.value)).toBe('4')
		} finally {
			engine.dispose()
		}
	})

	it('preserves getter semantics without invoking getters during capture', () => {
		const getter = vi.fn(function (this: { n: number }) {
			return this.n
		})
		const initial = Object.defineProperty({ n: 0 }, 'toJSON', { get: getter })
		const snapshot = cloneDefault(initial) as { n: number; toJSON: number }
		expect(getter).not.toHaveBeenCalled()
		initial.n = 5
		expect(snapshot.toJSON).toBe(0)
	})

	it('preserves Date subclass serializers, sparse arrays and own special keys', () => {
		class Timestamp extends Date {
			override toJSON() {
				return String(this.getTime())
			}
		}
		const initial: unknown[] = [new Timestamp(1000)]
		initial.length = 3
		initial[2] = JSON.parse('{"__proto__":{"n":0}}') as unknown
		const snapshot = cloneDefault(initial) as unknown[]
		expect(JSON.stringify(snapshot)).toBe('["1000",null,{"__proto__":{"n":0}}]')
		expect(1 in snapshot).toBe(false)
		expect(Object.prototype).not.toHaveProperty('n')
	})
})
