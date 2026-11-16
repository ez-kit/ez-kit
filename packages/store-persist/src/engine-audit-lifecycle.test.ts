import { afterEach, describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from './binding'
import { paramNumber } from './codecs'
import { createPersistEngine } from './engine'
import { attachHandles, persistHandle } from './handle'
import { encodeRecord } from './record'
import { objectPort, observable } from './test-kit'

import type { PersistBinding } from './binding'
import type { PersistEngine } from './engine'
import type { FieldDescriptor, Keyed, PersistOptions, SourcePort } from './types'

const engines: PersistEngine[] = []
function engine(port: SourcePort, onError = vi.fn()) {
	const result = createPersistEngine(port, { onError })
	engines.push(result)
	return result
}
function bind(
	state: object,
	id = 'one',
	options: PersistOptions = {},
	fields: FieldDescriptor[] = [{ path: ['width'], parser: paramNumber() }],
) {
	const result = createBinding(state, objectPort, fields, options)
	captureDefaults(result)
	addressBinding(result, { path: [id], name: 'panel', id })
	return result
}
function keyOf(binding: PersistBinding): string {
	const key = binding.keyOf.values().next().value
	if (key === undefined) throw new Error('Missing fixture key')
	return key
}
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
async function tick() {
	for (let i = 0; i < 12; i++) await Promise.resolve()
}
afterEach(() => {
	for (const instance of engines.splice(0)) instance.dispose()
	vi.useRealTimers()
})

describe('second-audit operation lifetime regressions', () => {
	it('keeps a detached handle able to retry failures and await the actual retained write acknowledgement', async () => {
		let offline = true
		const saved = deferred<undefined>()
		const set = vi.fn(() => (offline ? Promise.reject(new Error('offline')) : saved.promise))
		const instance = engine({ get: () => new Map(), set })
		const state = observable({ width: 320 })
		const binding = bind(state)
		attachHandles(state, [{ source: 'remote', binding }])
		const handle = persistHandle(state, 'remote')
		const disconnect = instance.connect(binding)
		state.width = 500
		disconnect()
		await tick()
		expect(handle.getStatus()).toMatchObject({ dirty: true, write: 'error' })
		await expect(handle.flush()).rejects.toThrow('offline')
		offline = false
		let settled = false
		const flush = handle.flush().then(() => {
			settled = true
		})
		await tick()
		expect(settled).toBe(false)
		expect(set).toHaveBeenCalledTimes(3)
		saved.resolve(undefined)
		await flush
		expect(handle.getStatus()).toMatchObject({ dirty: false, write: 'idle' })
		expect(binding.controller).toBeNull()
	})
	it('rejects a fully disconnected handle whose later mutations cannot be observed', async () => {
		const instance = engine({ get: () => new Map(), set: () => undefined })
		const state = observable({ width: 320 })
		const binding = bind(state)
		attachHandles(state, [{ source: 'remote', binding }])
		const disconnect = instance.connect(binding)
		disconnect()
		state.width = 500
		expect(binding.status.dirty).toBe(false)
		await expect(persistHandle(state, 'remote').flush()).rejects.toThrow('disconnected')
	})
	it('rejects a dirty disconnected handle after disposal instead of acknowledging its unsaved value', async () => {
		const saved = deferred<undefined>()
		const instance = engine({ get: () => new Map(), set: () => saved.promise })
		const state = observable({ width: 320 })
		const binding = bind(state)
		attachHandles(state, [{ source: 'remote', binding }])
		instance.connect(binding)
		state.width = 500
		await tick()
		instance.dispose()
		await expect(persistHandle(state, 'remote').flush()).rejects.toThrow('disconnected')
		saved.resolve(undefined)
		await tick()
	})
	it('does not apply an old restore while a detached handle retains its dirty write controller', async () => {
		const read = deferred<Keyed>()
		const saved = deferred<undefined>()
		const instance = engine({ get: () => read.promise, set: () => saved.promise })
		const state = observable({ width: 320 })
		const binding = bind(state)
		const disconnect = instance.connect(binding)
		state.width = 500
		disconnect()
		expect(binding.controller).toBe(instance)
		read.resolve(new Map([[keyOf(binding), '700']]))
		await tick()
		expect(state.width).toBe(500)
		expect(binding.status.restore).toBe('idle')
		saved.resolve(undefined)
		await instance.flush(binding)
	})
	it.each(['pull', 'restore'] as const)(
		'releases stale future-version protection on authoritative absence through %s',
		async (operation) => {
			let values: Keyed = new Map()
			const set = vi.fn()
			const instance = engine({ capabilities: { recordVersions: true }, get: () => values, set })
			const state = observable({ width: 320 })
			const binding = bind(state)
			const key = keyOf(binding)
			values.set(key, encodeRecord('700', 2))
			instance.connect(binding)
			expect(binding.status.writeBlocked).toBe('future-version')
			values = new Map()
			if (operation === 'pull') instance.pull(values)
			else await instance.restore(binding)
			expect(binding.status.writeBlocked).toBeNull()
			state.width = 500
			await instance.flush(binding)
			expect(set).toHaveBeenCalledOnce()
		},
	)
	it('an explicit absent-record retry releases a block without replacing an already edited value', async () => {
		let values: Keyed = new Map()
		const set = vi.fn()
		const instance = engine({ capabilities: { recordVersions: true }, get: () => values, set })
		const state = observable({ width: 320 })
		const binding = bind(state)
		values.set(keyOf(binding), encodeRecord('700', 2))
		instance.connect(binding)
		state.width = 500
		await expect(instance.flush(binding)).rejects.toThrow()
		values = new Map()
		await instance.restore(binding)
		await instance.flush(binding)
		expect(state.width).toBe(500)
		expect(binding.status.writeBlocked).toBeNull()
		expect(set).toHaveBeenCalledOnce()
	})
	it('applies clean external fields while preserving an independently edited field from the same snapshot', async () => {
		const response = deferred<Keyed>()
		let reads = 0
		const instance = engine({ get: () => (++reads === 1 ? new Map() : response.promise), set: () => undefined })
		const state = observable({ width: 320, other: 100 })
		const binding = bind(state, 'one', {}, [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['other'], parser: paramNumber() },
		])
		instance.connect(binding)
		instance.pullSource()
		state.width = 500
		response.resolve(
			new Map([...binding.keyOf].map(([field, key]) => [key, field.path[0] === 'width' ? '900' : '700'])),
		)
		await tick()
		expect(state).toMatchObject({ width: 500, other: 700 })
	})
	it('does not let reset in one scope discard another scope from the same async external response', async () => {
		const response = deferred<Keyed>()
		let reads = 0
		const instance = engine({
			get: () => (++reads <= 2 ? new Map() : response.promise),
			set: () => undefined,
			removeScope: () => undefined,
		})
		const a = observable({ width: 320 }),
			b = observable({ width: 320 })
		const aa = bind(a, 'a'),
			bb = bind(b, 'b')
		instance.connect(aa)
		instance.connect(bb)
		instance.pullSource()
		await instance.resetScope(['a'])
		response.resolve(
			new Map([
				[keyOf(aa), '900'],
				[keyOf(bb), '700'],
			]),
		)
		await tick()
		expect(a.width).toBe(320)
		expect(b.width).toBe(700)
	})
	it('keeps external snapshots from an old connection out after disconnect and reconnect', async () => {
		const response = deferred<Keyed>()
		let reads = 0
		const instance = engine({ get: () => (++reads === 1 ? new Map() : response.promise), set: () => undefined })
		const state = observable({ width: 320 })
		const binding = bind(state)
		const disconnect = instance.connect(binding)
		instance.pullSource()
		disconnect()
		instance.connect(binding)
		response.resolve(new Map([[keyOf(binding), '700']]))
		await tick()
		expect(state.width).toBe(320)
	})
	it.each(['reset', 'disconnect', 'dispose', 'superseded', 'restore'] as const)(
		'ignores obsolete external read rejections after %s',
		async (action) => {
			const response = deferred<Keyed>()
			let reads = 0
			const report = vi.fn()
			const instance = engine(
				{ get: () => (++reads === 1 ? new Map() : reads === 2 ? response.promise : new Map()), set: () => undefined },
				report,
			)
			const state = observable({ width: 320 })
			const binding = bind(state)
			const disconnect = instance.connect(binding)
			instance.pullSource()
			if (action === 'reset') await instance.reset(binding)
			if (action === 'disconnect') disconnect()
			if (action === 'dispose') instance.dispose()
			if (action === 'superseded') instance.pullSource()
			if (action === 'restore') await instance.restore(binding)
			response.reject(new Error('obsolete failure'))
			await tick()
			expect(report).not.toHaveBeenCalled()
		},
	)
	it('still reports a current external read failure with its affected addresses', async () => {
		const response = deferred<Keyed>()
		let reads = 0
		const report = vi.fn()
		const instance = engine({ get: () => (++reads === 1 ? new Map() : response.promise), set: () => undefined }, report)
		const binding = bind(observable({ width: 320 }))
		instance.connect(binding)
		instance.pullSource()
		const failure = new Error('current failure')
		response.reject(failure)
		await tick()
		expect(report).toHaveBeenCalledWith(
			failure,
			expect.objectContaining({ operation: 'read', address: binding.fields[0]?.address }),
		)
	})
	it('does not reserve earlier addresses when a later field fails connection validation', () => {
		const get = vi.fn(() => new Map())
		const instance = engine({ get, set: () => undefined })
		instance.connect(bind(observable({ other: 100 }), 'one', {}, [{ path: ['other'], parser: paramNumber() }]))
		const bad = bind(observable({ width: 320, other: 100 }), 'one', {}, [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['other'], parser: paramNumber() },
		])
		expect(() => instance.connect(bad)).toThrow('Address collision')
		expect(get).toHaveBeenCalledOnce()
		expect(() => instance.connect(bind(observable({ width: 320 })))).not.toThrow()
	})
	it('preflights physical collisions within a binding without leaking either physical or logical ownership', () => {
		const instance = engine({ get: () => new Map(), set: () => undefined, keyForField: () => 'shared' })
		const bad = bind(observable({ width: 320, other: 100 }), 'one', {}, [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['other'], parser: paramNumber() },
		])
		expect(() => instance.connect(bad)).toThrow('Physical key collision')
		expect(() => instance.connect(bind(observable({ width: 320 }), 'next'))).not.toThrow()
	})
	it('releases acquired ownership when subscription setup throws', () => {
		const instance = engine({ get: () => new Map(), set: () => undefined })
		const bad = bind(observable({ width: 320 }))
		bad.port = {
			...objectPort,
			subscribe: () => {
				throw new Error('subscription failure')
			},
		}
		expect(() => instance.connect(bad)).toThrow('subscription failure')
		expect(bad.controller).toBeNull()
		expect(() => instance.connect(bind(observable({ width: 320 })))).not.toThrow()
	})
	it('rejects disposed reset operations promptly without changing memory or touching the port', async () => {
		const set = vi.fn(),
			removeScope = vi.fn()
		const instance = engine({ get: () => new Map(), set, removeScope })
		const state = observable({ width: 320 }),
			binding = bind(state)
		instance.connect(binding)
		state.width = 500
		instance.dispose()
		await expect(instance.reset(binding)).rejects.toThrow('disposed')
		await expect(instance.resetScope(['one'])).rejects.toThrow('disposed')
		expect(state.width).toBe(500)
		expect(set).not.toHaveBeenCalled()
		expect(removeScope).not.toHaveBeenCalled()
	})
	it('lets an explicit null retry disable an inherited finite timeout without changing a pending deadline', async () => {
		vi.useFakeTimers()
		const first = deferred<Keyed>(),
			retry = deferred<Keyed>()
		let reads = 0
		const instance = engine({ get: () => (++reads === 1 ? first.promise : retry.promise), set: () => undefined })
		const binding = bind(observable({ width: 320 }), 'one', { restore: { timeoutMs: 5 } })
		instance.connect(binding)
		const joined = instance.restore(binding, { timeoutMs: null })
		await vi.advanceTimersByTimeAsync(5)
		expect((await joined).status).toBe('timeout')
		const pending = instance.restore(binding, { timeoutMs: null })
		await vi.advanceTimersByTimeAsync(1000)
		expect(binding.status.restore).toBe('pending')
		retry.resolve(new Map())
		await expect(pending).resolves.toMatchObject({ status: 'ready' })
	})
	it('honors null inherited timeout and still rejects invalid numeric retry timeouts before a read', async () => {
		vi.useFakeTimers()
		const response = deferred<Keyed>()
		const get = vi.fn(() => response.promise)
		const instance = engine({ get, set: () => undefined })
		const binding = bind(observable({ width: 320 }), 'one', { restore: { timeoutMs: null } })
		instance.connect(binding)
		await vi.advanceTimersByTimeAsync(1000)
		expect(binding.status.restore).toBe('pending')
		response.resolve(new Map())
		await tick()
		for (const timeoutMs of [-1, Infinity, NaN])
			expect(() => instance.restore(binding, { timeoutMs })).toThrow('Invalid restore timeoutMs')
		expect(get).toHaveBeenCalledOnce()
	})
})
