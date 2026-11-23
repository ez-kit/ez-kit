import { createContext, runInContext } from 'node:vm'

import { createServiceRegistry } from '@ez-kit/store-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from './binding'
import { paramNumber } from './codecs'
import { createPersistEngine } from './engine'
import { attachHandles, persistHandle } from './handle'
import { persist } from './plugin'
import { encodeRecord } from './record'
import { createPersistEngines, PERSIST_ENGINES } from './service'
import { SourceMutationCancelledError } from './source-errors'
import { patchKeyed } from './storage/patch'
import { objectPort, observable } from './test-kit'

import type { PersistBinding } from './binding'
import type { PersistEngine } from './engine'
import type { CommitCtx, FieldDescriptor, Keyed, SourcePort } from './types'

const engines: PersistEngine[] = []
function engine(port: SourcePort) {
	const result = createPersistEngine(port)
	engines.push(result)
	return result
}
function bind(state: object, id = 'one', fields: FieldDescriptor[] = [{ path: ['width'], parser: paramNumber() }]) {
	const result = createBinding(state, objectPort, fields, {})
	captureDefaults(result)
	addressBinding(result, { path: ['devices'], name: 'panel', id })
	return result
}
function key(binding: PersistBinding, index = 0) {
	const found = [...binding.keyOf.values()][index]
	if (found === undefined) throw new Error('Missing fixture key')
	return found
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
function foreignDeferred<T>() {
	const context = createContext({})
	const promise = runInContext(
		'new Promise((resolve, reject) => { globalThis.resolveValue = resolve; globalThis.rejectValue = reject })',
		context,
	) as Promise<T>
	return {
		promise,
		resolve(value: T) {
			;(runInContext('resolveValue', context) as (value: T) => void)(value)
		},
		reject(error: unknown) {
			;(runInContext('rejectValue', context) as (error: unknown) => void)(error)
		},
	}
}
function memory() {
	let values: Keyed = new Map()
	let offline = false
	const writes: { desired: Keyed; context: CommitCtx }[] = []
	const port: SourcePort = {
		get: () => new Map(values),
		set: (desired, context) => {
			if (offline) throw new Error('offline')
			writes.push({ desired: new Map(desired), context })
			values = patchKeyed(values, desired, context)
		},
		removeScope: () => {
			values.clear()
		},
	}
	return {
		port,
		writes,
		get values() {
			return values
		},
		set offline(value: boolean) {
			offline = value
		},
	}
}
async function tick() {
	for (let i = 0; i < 16; i++) await Promise.resolve()
}
afterEach(() => {
	for (const item of engines.splice(0)) item.dispose()
})

describe('address ownership across detached instances', () => {
	it('never replays a failed detached value after the successor acknowledges a newer value', async () => {
		const saved = memory(),
			instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		attachHandles(oldState, [{ source: 'remote', binding: previous }])
		const previousHandle = persistHandle(oldState, 'remote')
		const disconnect = instance.connect(previous)
		saved.offline = true
		oldState.width = 500
		await tick()
		disconnect()
		await tick()
		saved.offline = false
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		nextState.width = 700
		await instance.flush(successor)
		await instance.flush()
		expect(saved.values.get(key(successor))).toBe('700')
		await expect(instance.flush(previous)).rejects.toThrow('superseded')
		await expect(previousHandle.flush()).rejects.toThrow(/superseded|disconnected/)
		expect((await previousHandle.restore()).status).toBe('idle')
		expect((await instance.restore(previous)).status).toBe('error')
		await expect(instance.reset(previous)).rejects.toThrow('superseded')
		expect(saved.values.get(key(successor))).toBe('700')
	})
	it('settles source flush when an old failed record and its successor would otherwise compete in one key map', async () => {
		const saved = memory(),
			instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		const disconnect = instance.connect(previous)
		saved.offline = true
		oldState.width = 500
		await tick()
		disconnect()
		await tick()
		saved.offline = false
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		nextState.width = 700
		await instance.flush()
		expect(saved.values.get(key(successor))).toBe('700')
		expect(successor.status.dirty).toBe(false)
	})
	it('rejects an unsent old fence on ownership transfer while keeping unrelated queued records', async () => {
		const saved = memory(),
			gate = deferred<undefined>()
		const commit = saved.port.set
		let first = true
		saved.port.set = (desired, context) => {
			if (first) {
				first = false
				return gate.promise.then(() => commit(desired, context))
			}
			return commit(desired, context)
		}
		const instance = engine(saved.port)
		const otherState = observable({ width: 320 }),
			other = bind(otherState, 'other')
		instance.connect(other)
		otherState.width = 450
		await tick()
		const oldState = observable({ width: 320, height: 100 })
		const previous = bind(oldState, 'one', [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['height'], parser: paramNumber() },
		])
		const disconnect = instance.connect(previous)
		oldState.width = 500
		oldState.height = 200
		disconnect()
		const rejected = expect(instance.flush(previous)).rejects.toThrow('superseded')
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		nextState.width = 700
		await rejected
		const flushed = instance.flush()
		gate.resolve(undefined)
		await flushed
		expect(saved.values.get(key(successor))).toBe('700')
		expect(saved.values.get(key(previous, 1))).toBe('200')
		expect(saved.values.get(key(other))).toBe('450')
		expect(saved.writes.some((entry) => entry.desired.get(key(previous)) === '500')).toBe(false)
	})
	it('keeps an already-sent old mutation ordered before the successor and awaits its actual acknowledgement', async () => {
		const saved = memory(),
			gate = deferred<undefined>()
		const commit = saved.port.set
		let first = true
		saved.port.set = (desired, context) =>
			first ? ((first = false), gate.promise.then(() => commit(desired, context))) : commit(desired, context)
		const instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		const disconnect = instance.connect(previous)
		oldState.width = 500
		let oldDone = false
		const oldFlush = instance.flush(previous).then(() => {
			oldDone = true
		})
		disconnect()
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		let cleanDone = false
		const cleanFlush = instance.flush(successor).then(() => {
			cleanDone = true
		})
		await tick()
		expect(oldDone).toBe(false)
		expect(cleanDone).toBe(false)
		nextState.width = 700
		const nextFlush = instance.flush(successor)
		gate.resolve(undefined)
		await Promise.all([oldFlush, cleanFlush, nextFlush])
		expect(saved.writes.map((entry) => entry.desired.get(key(successor)))).toEqual(['500', '700'])
	})
	it('does not retire old intent when the successor fails to subscribe', async () => {
		const saved = memory(),
			instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		const disconnect = instance.connect(previous)
		saved.offline = true
		oldState.width = 500
		await tick()
		disconnect()
		await tick()
		const invalid = bind(observable({ width: 320 }))
		invalid.port = {
			...objectPort,
			subscribe: () => {
				throw new Error('cannot subscribe')
			},
		}
		expect(() => instance.connect(invalid)).toThrow('cannot subscribe')
		saved.offline = false
		await instance.flush(previous)
		expect(saved.values.get(key(previous))).toBe('500')
	})
	it('retains failed writes across a same-instance reconnect without superseding itself', async () => {
		const saved = memory(),
			instance = engine(saved.port)
		const state = observable({ width: 320 }),
			binding = bind(state)
		const disconnect = instance.connect(binding)
		saved.offline = true
		state.width = 500
		await tick()
		disconnect()
		await tick()
		saved.offline = false
		instance.connect(binding)
		await instance.flush(binding)
		expect(saved.values.get(key(binding))).toBe('500')
	})
	it('preserves an already-sent explicit deletion before successor edits', async () => {
		const saved = memory(),
			gate = deferred<undefined>()
		const commit = saved.port.set
		saved.port.set = (desired, context) =>
			context.explicitReset ? gate.promise.then(() => commit(desired, context)) : commit(desired, context)
		const instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		const disconnect = instance.connect(previous)
		oldState.width = 500
		await instance.flush(previous)
		const reset = instance.reset(previous)
		disconnect()
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		expect(nextState.width).toBe(320)
		nextState.width = 700
		let done = false
		const flush = instance.flush(successor).then(() => {
			done = true
		})
		await tick()
		expect(done).toBe(false)
		gate.resolve(undefined)
		await Promise.all([reset, flush])
		expect(saved.values.get(key(successor))).toBe('700')
		expect(saved.writes.map((entry) => entry.context.diff.removed.includes(key(successor)))).toEqual([
			false,
			true,
			false,
		])
	})
	it('retries failed old deletion for the successor and rejects its flush promptly when deletion still fails', async () => {
		const saved = memory(),
			commit = saved.port.set
		let rejectDelete = true
		saved.port.set = (desired, context) => {
			if (context.explicitReset && rejectDelete) throw new Error('delete offline')
			return commit(desired, context)
		}
		const instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		const disconnect = instance.connect(previous)
		oldState.width = 500
		await instance.flush(previous)
		await expect(instance.reset(previous)).rejects.toThrow('delete offline')
		disconnect()
		await tick()
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		nextState.width = 700
		await expect(instance.flush(successor)).rejects.toThrow('delete offline')
		rejectDelete = false
		await instance.flush(successor)
		expect(saved.values.get(key(successor))).toBe('700')
	})
	it('lets full scope deletion acknowledge an inherited failed record deletion before later edits', async () => {
		const saved = memory(),
			commit = saved.port.set
		saved.port.set = (desired, context) => {
			if (context.explicitReset) throw new Error('delete offline')
			return commit(desired, context)
		}
		const instance = engine(saved.port)
		const oldState = observable({ width: 320 }),
			previous = bind(oldState)
		const disconnect = instance.connect(previous)
		oldState.width = 500
		await instance.flush(previous)
		await expect(instance.reset(previous)).rejects.toThrow('delete offline')
		disconnect()
		await tick()
		const nextState = observable({ width: 320 }),
			successor = bind(nextState)
		instance.connect(successor)
		await instance.resetScope(['devices'])
		nextState.width = 700
		await instance.flush(successor)
		expect(saved.values.get(key(successor))).toBe('700')
	})
})

describe('preconnection user edits', () => {
	it('reconciles an edit after captured defaults before its first read can replace the observed baseline', async () => {
		const saved = memory(),
			instance = engine(saved.port)
		const state = observable({ width: 320 }),
			binding = bind(state)
		state.width = 500
		instance.connect(binding)
		await instance.flush(binding)
		expect(saved.values.get(key(binding))).toBe('500')
	})
	it('detects actual off-subscription edits on a same-instance reconnect', async () => {
		const saved = memory(),
			instance = engine(saved.port)
		const state = observable({ width: 320 }),
			binding = bind(state)
		const disconnect = instance.connect(binding)
		disconnect()
		await tick()
		state.width = 500
		instance.connect(binding)
		await instance.flush(binding)
		expect(saved.values.get(key(binding))).toBe('500')
	})
	it('preflights every source before a prepared dirty binding can connect or issue I/O', async () => {
		const firstGet = vi.fn(() => new Map()),
			firstSet = vi.fn()
		const first = engine({ get: firstGet, set: firstSet }),
			second = engine({ get: () => new Map(), set: () => undefined })
		const services = createServiceRegistry([
			[
				PERSIST_ENGINES,
				createPersistEngines(
					new Map([
						['first', first],
						['second', second],
					]),
				),
			],
		])
		const context = { services, id: { path: ['devices'], name: 'panel', id: 'one' }, isServer: false }
		const occupying = observable({ q: 0 })
		const other = persist<object, typeof occupying>(objectPort, {
			fields: (field) => [field((state) => state.q, { source: 'second' })],
		})
		const release = other.setup(occupying, context)
		const state = observable({ p: 0, q: 0 })
		const plugin = persist<object, typeof state>(objectPort, {
			fields: (field) => [
				field((value) => value.p, { source: 'first' }),
				field((value) => value.q, { source: 'second' }),
			],
		})
		plugin.seedRender?.(state, context)
		state.p = 500
		expect(() => plugin.setup(state, context)).toThrow('collision')
		await first.flush()
		expect(firstGet).not.toHaveBeenCalled()
		expect(firstSet).not.toHaveBeenCalled()
		release?.()
		const cleanup = plugin.setup(state, context)
		await first.flush()
		expect(firstSet).toHaveBeenCalledOnce()
		cleanup?.()
	})
})

describe('cross-realm async source values', () => {
	it('waits for foreign read Promises without invalidating records or writing defaults', async () => {
		const response = foreignDeferred<Keyed>(),
			set = vi.fn()
		const instance = engine({ get: () => response.promise, set })
		const state = observable({ width: 320 }),
			binding = bind(state)
		instance.connect(binding)
		await tick()
		expect(binding.status.restore).toBe('pending')
		expect(set).not.toHaveBeenCalled()
		response.resolve(new Map([[key(binding), '700']]))
		await instance.restore(binding)
		expect(state.width).toBe(700)
		expect(set).not.toHaveBeenCalled()
	})
	it.each(['set', 'removeScope', 'rewriteContainer'] as const)(
		'waits for foreign %s acknowledgements',
		async (kind) => {
			const acknowledgement = foreignDeferred<undefined>()
			const port: SourcePort = {
				get(context) {
					if (kind === 'rewriteContainer') context?.stageContainerRewrite?.(new Map())
					return new Map()
				},
				set: () => (kind === 'set' ? acknowledgement.promise : undefined),
				removeScope: () => acknowledgement.promise,
				rewriteContainer: () => acknowledgement.promise,
			}
			const instance = engine(port)
			const state = observable({ width: 320 }),
				binding = bind(state)
			instance.connect(binding)
			if (kind === 'set') state.width = 500
			const operation = kind === 'removeScope' ? instance.resetScope(['devices']) : instance.flush(binding)
			let done = false
			const flushed = operation.then(() => {
				done = true
			})
			await tick()
			expect(done).toBe(false)
			acknowledgement.resolve(undefined)
			await flushed
		},
	)
	it('reports rejected foreign writes and retains their dirty values for retry', async () => {
		const acknowledgement = foreignDeferred<undefined>()
		const instance = engine({ get: () => new Map(), set: () => acknowledgement.promise })
		const state = observable({ width: 320 }),
			binding = bind(state)
		instance.connect(binding)
		state.width = 500
		const failed = expect(instance.flush(binding)).rejects.toThrow('foreign failure')
		acknowledgement.reject(new Error('foreign failure'))
		await failed
		expect(binding.status).toMatchObject({ dirty: true, write: 'error' })
	})
	it.each(['migrate', 'validate'] as const)(
		'rejects foreign asynchronous schema.%s results without an unhandled rejection',
		async (callback) => {
			const result = foreignDeferred<unknown>()
			const field: FieldDescriptor = {
				path: ['width'],
				parser: paramNumber(),
				schema:
					callback === 'migrate' ? { version: 1, migrate: () => result.promise } : { validate: () => result.promise },
			}
			const state = observable({ width: 320 }),
				binding = bind(state, 'one', [field])
			const instance = engine({
				capabilities: { recordVersions: true },
				get: () => new Map([[key(binding), encodeRecord('700', 0)]]),
				set: () => undefined,
			})
			instance.connect(binding)
			result.reject(new Error('unsupported asynchronous validator'))
			await tick()
			expect(state.width).toBe(320)
			expect(binding.status.records?.[0]?.outcome).toBe('invalidated')
			expect(binding.status.records?.[0]?.error).toBeInstanceOf(Error)
		},
	)
	it('keeps genuinely synchronous reads and writes synchronous', () => {
		const set = vi.fn(),
			state = observable({ width: 320 }),
			binding = bind(state)
		const instance = engine({ get: () => new Map([[key(binding), '700']]), set })
		instance.connect(binding)
		expect(state.width).toBe(700)
		state.width = 500
		void instance.flush(binding)
		expect(set).toHaveBeenCalledOnce()
		expect(binding.status.write).toBe('idle')
	})
})

describe('cancelled source mutations', () => {
	it('rejects a cancelled save, restores committed state and does not resurrect it on an unrelated queued edit', async () => {
		const gate = deferred<undefined>()
		const state = observable({ width: 320, height: 100 })
		const binding = bind(state, 'one', [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['height'], parser: paramNumber() },
		])
		let values: Keyed = new Map([
			[key(binding), '400'],
			[key(binding, 1), '200'],
		])
		let first = true
		const set = vi.fn((desired: Keyed, context: CommitCtx) => {
			if (first) {
				first = false
				return gate.promise
			}
			values = patchKeyed(values, desired, context)
		})
		const instance = engine({ get: () => new Map(values), set })
		instance.connect(binding)
		state.width = 500
		const cancelled = expect(instance.flush(binding)).rejects.toThrow('cancelled')
		state.height = 300
		gate.reject(new SourceMutationCancelledError())
		await cancelled
		await tick()
		await instance.flush(binding)
		expect(state).toMatchObject({ width: 400, height: 300 })
		expect(values.get(key(binding))).toBe('400')
		expect(values.get(key(binding, 1))).toBe('300')
		expect(set).toHaveBeenCalledTimes(2)
	})
	it('preserves a newer edit to the cancelled record and acknowledges its successor write', async () => {
		const gate = deferred<undefined>()
		const state = observable({ width: 320 }),
			binding = bind(state)
		let values: Keyed = new Map([[key(binding), '400']])
		let first = true
		const instance = engine({
			get: () => new Map(values),
			set: (desired, context) => {
				if (first) {
					first = false
					return gate.promise
				}
				values = patchKeyed(values, desired, context)
			},
		})
		instance.connect(binding)
		state.width = 500
		const cancelled = expect(instance.flush(binding)).rejects.toThrow('cancelled')
		state.width = 700
		const successor = instance.flush(binding)
		gate.reject(new SourceMutationCancelledError())
		await cancelled
		await successor
		expect(state.width).toBe(700)
		expect(values.get(key(binding))).toBe('700')
	})
	it('releases a cancelled reset barrier and restores the committed value before later writes', async () => {
		const gate = deferred<undefined>()
		const state = observable({ width: 320 }),
			binding = bind(state)
		let values: Keyed = new Map([[key(binding), '400']])
		const instance = engine({
			get: () => new Map(values),
			set: (desired, context) => {
				if (context.explicitReset) return gate.promise
				values = patchKeyed(values, desired, context)
			},
		})
		instance.connect(binding)
		const cancelled = expect(instance.reset(binding)).rejects.toThrow('cancelled')
		gate.reject(new SourceMutationCancelledError())
		await cancelled
		expect(state.width).toBe(400)
		state.width = 700
		await instance.flush(binding)
		expect(values.get(key(binding))).toBe('700')
	})
})
