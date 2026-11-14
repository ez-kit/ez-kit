import { serializePersistAddress } from '@ez-kit/store-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from './binding'
import { paramJson, paramNumber } from './codecs'
import { createPersistEngine } from './engine'
import { decodeRecord, encodeRecord } from './record'
import { patchKeyed, removeKeyedScope } from './storage/patch'
import { objectPort, observable } from './test-kit'
import { createUrlPort } from './url/adapter'

import type { CommitCtx, FieldDescriptor, Keyed, PersistOptions, SourcePort } from './types'

const id = (entry = 'workspace', path = ['devices']) => ({ path, name: 'panel', id: entry })
const key = (field = 'width', entry = 'workspace', path = ['devices']) =>
	serializePersistAddress({ store: id(entry, path), field: [field] })
const tick = async (): Promise<void> => {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
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
function memory(initial: Keyed = new Map()) {
	let values = new Map(initial)
	const port: SourcePort = {
		capabilities: { recordVersions: true },
		get: vi.fn(() => new Map(values)),
		set: vi.fn((desired: Keyed, context: CommitCtx) => {
			values = patchKeyed(values, desired, context)
		}),
		removeScope: vi.fn((path: readonly string[]) => {
			values = removeKeyedScope(values, path)
		}),
	}
	return {
		port,
		get values() {
			return values
		},
	}
}
function binding(
	state: object,
	fields: FieldDescriptor[] = [{ path: ['width'], parser: paramNumber() }],
	options: PersistOptions = {},
	entry = 'workspace',
	path = ['devices'],
) {
	const result = createBinding(state, objectPort, fields, options)
	captureDefaults(result)
	addressBinding(result, id(entry, path))
	return result
}

afterEach(() => {
	vi.useRealTimers()
})

describe('scoped restoration and schemas', () => {
	it('rejects a flush when a codec throws without a reason and retains the dirty edit', async () => {
		const engine = createPersistEngine(memory().port)
		const state = observable({ width: 320 })
		const target = binding(state, [
			{
				path: ['width'],
				parser: {
					parse: Number,
					stringify: (value) => {
						if (value === 500) {
							// eslint-disable-next-line @typescript-eslint/only-throw-error -- exercise a malformed third-party codec
							throw undefined
						}
						return String(value)
					},
				},
			},
		])
		engine.connect(target)
		state.width = 500
		await expect(engine.flush(target)).rejects.toThrow('Cannot encode persistent value')
		expect(state.width).toBe(500)
		expect(target.status.dirty).toBe(true)
	})
	it('normalizes a current record, keeps independent versions and rejects versioned URL fields', async () => {
		const saved = memory(
			new Map([
				[key(), encodeRecord('501', 1)],
				[key('other'), encodeRecord('600', 3)],
			]),
		)
		const state = observable({ width: 320, other: 400 })
		const engine = createPersistEngine(saved.port)
		engine.connect(
			binding(state, [
				{
					path: ['width'],
					parser: paramNumber(),
					schema: { version: 1, validate: (value) => Math.round(Number(value) / 10) * 10 },
				},
				{ path: ['other'], parser: paramNumber(), schema: { version: 3 } },
			]),
		)
		await engine.flush()
		expect(state).toMatchObject({ width: 500, other: 600 })
		expect(decodeRecord(saved.values.get(key()) ?? '')).toEqual({ version: 1, value: '500' })
		expect(decodeRecord(saved.values.get(key('other')) ?? '')).toEqual({ version: 3, value: '600' })
		const url = createPersistEngine(createUrlPort({ read: () => new URLSearchParams(), commit: () => undefined }))
		expect(() =>
			url.connect(
				binding(observable({ width: 320 }), [{ path: ['width'], parser: paramNumber(), schema: { version: 1 } }]),
			),
		).toThrow('does not support record versions')
	})
	it('a repeated scope reset supersedes a failed delete barrier', async () => {
		const saved = memory()
		const remove = saved.port.removeScope
		let fail = true
		saved.port.removeScope = (path) => {
			if (fail) {
				fail = false
				throw new Error('offline')
			}
			return remove?.(path)
		}
		const engine = createPersistEngine(saved.port)
		const state = observable({ width: 320 })
		const target = binding(state)
		engine.connect(target)
		await expect(engine.resetScope(['devices'])).rejects.toThrow('offline')
		await engine.resetScope(['devices'])
		state.width = 500
		await engine.flush(target)
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
	})
	it('retries a failed explicit delete before a newer edit, including a future record', async () => {
		const saved = memory(new Map([[key(), encodeRecord('900', 9)]]))
		const remove = saved.port.set
		let fail = true
		saved.port.set = (desired, context) => {
			if (context.explicitReset && fail) {
				fail = false
				// A third-party port may reject without a reason; normalize it into an observable failure.
				// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
				return Promise.reject(undefined)
			}
			return remove(desired, context)
		}
		const report = vi.fn()
		const engine = createPersistEngine(saved.port, { onError: report })
		const state = observable({ width: 320 })
		const target = binding(state)
		engine.connect(target)
		await expect(engine.reset(target)).rejects.toThrow('Source mutation failed')
		state.width = 500
		await engine.flush(target)
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		expect(target.status.dirty).toBe(false)
		expect(report).toHaveBeenCalledTimes(1)
	})

	it('does not rewrite a migrated container from a stale read after a user edit', async () => {
		const old = deferred<Keyed>()
		const saved = memory()
		let stage: ((values: Keyed) => void) | undefined
		saved.port.get = (context) => {
			stage = context?.stageContainerRewrite
			return old.promise
		}
		const engine = createPersistEngine(saved.port)
		const state = observable({ width: 320 })
		const target = binding(state)
		engine.connect(target)
		state.width = 500
		await engine.flush(target)
		stage?.(new Map([[key(), encodeRecord('700')]]))
		old.resolve(new Map([[key(), encodeRecord('700')]]))
		await target.restorePromise
		await tick()
		expect(state.width).toBe(500)
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		expect(saved.port.set).toHaveBeenCalledTimes(1)
	})

	it('joins a pending restore, preserves its deadline, and explicitly retries after timeout', async () => {
		vi.useFakeTimers()
		const first = deferred<Keyed>()
		const second = deferred<Keyed>()
		const get = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
		const engine = createPersistEngine({ get, set: vi.fn() })
		const state = observable({ width: 320 })
		const target = binding(state, undefined, { restore: { timeoutMs: 20 } })
		engine.connect(target)
		const pending = target.restorePromise
		expect(engine.restore(target, { timeoutMs: 1000 })).toBe(pending)
		await vi.advanceTimersByTimeAsync(20)
		expect(target.status.restore).toBe('timeout')
		const retry = engine.restore(target)
		first.reject(new Error('late rejection'))
		second.resolve(new Map([[key(), '640']]))
		await retry
		expect(state.width).toBe(640)
		expect(get).toHaveBeenCalledTimes(2)
	})

	it('validates schema versions and invalidates only unsupported old records', async () => {
		for (const version of [-1, 0.5, Infinity]) {
			const engine = createPersistEngine(memory().port)
			expect(() =>
				engine.connect(
					binding(observable({ width: 320 }), [{ path: ['width'], parser: paramNumber(), schema: { version } }]),
				),
			).toThrow('Invalid schema')
		}
		const saved = memory(
			new Map([
				[key(), encodeRecord('640', 1)],
				[key('other'), encodeRecord('900', 1)],
			]),
		)
		const migrate = vi.fn((value: unknown) => value)
		const engine = createPersistEngine(saved.port)
		const state = observable({ width: 320, other: 400 })
		const target = binding(state, [
			{ path: ['width'], parser: paramNumber(), schema: { version: 2 } },
			{ path: ['other'], parser: paramNumber(), schema: { version: 3, minVersion: 2, migrate } },
		])
		engine.connect(target)
		await engine.flush(target)
		expect(state).toMatchObject({ width: 320, other: 400 })
		expect(saved.values.size).toBe(0)
		expect(migrate).not.toHaveBeenCalled()
	})

	it('snapshots Date defaults and survives repeated reset without replacing the instance', async () => {
		const saved = memory()
		const engine = createPersistEngine(saved.port)
		const state = observable({ when: new Date('2020-01-01') })
		const target = binding(state, [
			{
				path: ['when'],
				parser: { parse: (raw) => new Date(raw), stringify: (value) => (value as Date).toISOString() },
			},
		])
		engine.connect(target)
		state.when.setUTCFullYear(2024)
		await engine.reset(target)
		expect(state.when.getUTCFullYear()).toBe(2020)
		state.when.setUTCFullYear(2025)
		await engine.reset(target)
		expect(state.when.getUTCFullYear()).toBe(2020)
		expect(target.store).toBe(state)
	})
	it('isolates scopes and retains foreign/unmounted keys across patches', async () => {
		const saved = memory(
			new Map([
				[key('width', 'closed'), encodeRecord('700')],
				['legacy', 'keep'],
			]),
		)
		const engine = createPersistEngine(saved.port)
		const devices = observable({ width: 320 })
		const users = observable({ width: 400 })
		engine.connect(binding(devices))
		engine.connect(binding(users, undefined, {}, 'workspace', ['users']))
		devices.width = 500
		users.width = 600
		await engine.flush()
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		expect(decodeRecord(saved.values.get(key('width', 'workspace', ['users'])) ?? '').value).toBe('600')
		expect(saved.values.get('legacy')).toBe('keep')
		expect(saved.values.has(key('width', 'closed'))).toBe(true)
		engine.dispose()
	})

	it('does not write defaults on connection, pending read or timeout; rejects late apply', async () => {
		vi.useFakeTimers()
		const read = deferred<Keyed>()
		const saved = memory(new Map([[key(), encodeRecord('800')]]))
		saved.port.get = vi.fn(() => read.promise)
		const state = observable({ width: 320 })
		const item = binding(state, undefined, { restore: { timeoutMs: 2000 }, clearOnDefault: false })
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		expect(item.status.restore).toBe('pending')
		expect(saved.port.get).toHaveBeenCalledTimes(1)
		await vi.advanceTimersByTimeAsync(2000)
		expect(item.status.restore).toBe('timeout')
		expect(saved.port.set).not.toHaveBeenCalled()
		state.width = 500
		await engine.flush()
		read.resolve(new Map([[key(), encodeRecord('800')]]))
		await tick()
		expect(state.width).toBe(500)
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		engine.dispose()
	})

	it('ignores a response after edit and return to default', async () => {
		const read = deferred<Keyed>()
		const saved = memory()
		saved.port.get = () => read.promise
		const state = observable({ width: 320 })
		const engine = createPersistEngine(saved.port)
		engine.connect(binding(state))
		state.width = 500
		state.width = 320
		read.resolve(new Map([[key(), encodeRecord('800')]]))
		await tick()
		expect(state.width).toBe(320)
		engine.dispose()
	})

	it('does not apply disconnected reads and reuses pending initial read on immediate reconnect', async () => {
		const read = deferred<Keyed>()
		const saved = memory()
		saved.port.get = vi.fn(() => read.promise)
		const state = observable({ width: 320 })
		const item = binding(state)
		const engine = createPersistEngine(saved.port)
		engine.connect(item)()
		const disconnect = engine.connect(item)
		expect(saved.port.get).toHaveBeenCalledTimes(1)
		disconnect()
		read.resolve(new Map([[key(), encodeRecord('800')]]))
		await tick()
		expect(state.width).toBe(320)
		engine.dispose()
	})

	it('migrates before current validation, rewrites version and isolates bad records', async () => {
		const validate = vi.fn((value: unknown) => {
			if (!value || typeof value !== 'object' || !('width' in value)) throw new Error('invalid layout')
			return value
		})
		const saved = memory(
			new Map([
				[key('layout'), encodeRecord('{"size":500}', 1)],
				[key('other'), encodeRecord('bad', 2)],
			]),
		)
		const state = observable({ layout: { width: 320 }, other: 10 })
		const engine = createPersistEngine(saved.port)
		engine.connect(
			binding(state, [
				{
					path: ['layout'],
					parser: paramJson(),
					schema: { version: 2, migrate: (value) => ({ width: (value as { size: number }).size }), validate },
				},
				{
					path: ['other'],
					parser: {
						parse: () => {
							throw new Error('invalid')
						},
						stringify: String,
					},
					schema: { version: 2 },
				},
			]),
		)
		await engine.flush()
		expect(state.layout).toEqual({ width: 500 })
		expect(validate).toHaveBeenCalledWith({ width: 500 })
		expect(decodeRecord(saved.values.get(key('layout')) ?? '').version).toBe(2)
		expect(saved.values.has(key('other'))).toBe(false)
		engine.dispose()
	})

	it.each([{ version: 2 }, { version: 2, minVersion: 1, migrate: vi.fn() }])(
		'invalidates unsupported old data: %j',
		async (schema) => {
			const saved = memory(new Map([[key(), encodeRecord('800', 0)]]))
			const state = observable({ width: 320 })
			const engine = createPersistEngine(saved.port)
			engine.connect(binding(state, [{ path: ['width'], parser: paramNumber(), schema }]))
			await engine.flush()
			expect(state.width).toBe(320)
			expect(saved.values.has(key())).toBe(false)
			if ('migrate' in schema) expect(schema.migrate).not.toHaveBeenCalled()
			engine.dispose()
		},
	)

	it('protects future versions before decode and permits explicit reset', async () => {
		const parse = vi.fn(() => 0)
		const saved = memory(new Map([[key(), encodeRecord('future-payload', 3)]]))
		const state = observable({ width: 320 })
		const item = binding(state, [{ path: ['width'], parser: { parse, stringify: String }, schema: { version: 2 } }])
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		state.width = 500
		await expect(engine.flush()).rejects.toThrow('future-version')
		expect(parse).not.toHaveBeenCalled()
		expect(decodeRecord(saved.values.get(key()) ?? '').version).toBe(3)
		await engine.reset(item)
		expect(saved.values.has(key())).toBe(false)
		expect(item.status.writeBlocked).toBeNull()
		engine.dispose()
	})

	it('guards writes against an unread future version after timeout', async () => {
		vi.useFakeTimers()
		const saved = memory(new Map([[key(), encodeRecord('800', 4)]]))
		saved.port.get = () => new Promise(() => undefined)
		const state = observable({ width: 320 })
		const item = binding(state, undefined, { restore: { timeoutMs: 1 } })
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		await vi.advanceTimersByTimeAsync(1)
		state.width = 500
		await expect(engine.flush()).rejects.toThrow('future-version')
		expect(decodeRecord(saved.values.get(key()) ?? '').version).toBe(4)
		engine.dispose()
	})
})

describe('scoped writes and reset barriers', () => {
	it('flush resolves its revision fence while a later write remains in flight', async () => {
		const first = deferred<undefined>()
		const later = deferred<undefined>()
		const saved = memory()
		let count = 0
		saved.port.set = () => (++count === 1 ? first.promise : later.promise)
		const state = observable({ width: 320 })
		const engine = createPersistEngine(saved.port)
		engine.connect(binding(state))
		state.width = 400
		const fence = engine.flush()
		state.width = 500
		await tick()
		first.resolve(undefined)
		await fence
		expect(count).toBe(2)
		later.resolve(undefined)
		await engine.flush()
		engine.dispose()
	})

	it('dispose invalidates scheduled work and physical URL collisions are rejected', async () => {
		const saved = memory()
		const state = observable({ width: 320 })
		const engine = createPersistEngine(saved.port)
		engine.connect(binding(state))
		state.width = 400
		engine.dispose()
		await tick()
		expect(saved.port.set).not.toHaveBeenCalled()
		const url = createPersistEngine(createUrlPort({ read: () => new URLSearchParams(), commit: () => undefined }))
		url.connect(binding(observable({ width: 320 })))
		expect(() => url.connect(binding(observable({ width: 400 }), undefined, {}, 'other'))).toThrow(
			/Physical key collision/,
		)
		url.dispose()
	})

	it('a failed scope delete can be retried without losing an edit made after reset', async () => {
		const saved = memory(new Map([[key(), encodeRecord('800')]]))
		const remove = saved.port.removeScope
		if (!remove) throw new Error('Missing scope deletion')
		let fail = true
		saved.port.removeScope = (path) => {
			if (fail) throw new Error('offline')
			return remove(path)
		}
		const engine = createPersistEngine(saved.port)
		const state = observable({ width: 320 })
		engine.connect(binding(state))
		await expect(engine.resetScope(['devices'])).rejects.toThrow('offline')
		expect(state.width).toBe(320)
		state.width = 500
		await tick()
		fail = false
		await engine.flush()
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		engine.dispose()
	})

	it('resetting one pending record still allows another clean record to restore', async () => {
		const read = deferred<Keyed>()
		const saved = memory()
		saved.port.get = () => read.promise
		const state = observable({ width: 320, other: 1 })
		const item = binding(state, [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['other'], parser: paramNumber() },
		])
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		await engine.reset(item, [['width']])
		read.resolve(
			new Map([
				[key(), encodeRecord('800')],
				[key('other'), encodeRecord('2')],
			]),
		)
		await tick()
		expect(state).toMatchObject({ width: 320, other: 2 })
		engine.dispose()
	})

	it('ambient ignore policy cannot be bypassed by a pull', () => {
		const saved = memory()
		const state = observable({ width: 320 })
		const engine = createPersistEngine(saved.port, { externalChanges: 'ignore' })
		engine.connect(binding(state))
		engine.pull(new Map([[key(), encodeRecord('800')]]))
		expect(state.width).toBe(320)
		engine.dispose()
	})
	it('serializes writes and drops superseded pending values without losing other addresses', async () => {
		const first = deferred<undefined>()
		const saved = memory()
		const set = saved.port.set
		let count = 0
		saved.port.set = vi.fn(async (values: Keyed, context: CommitCtx) => {
			if (++count === 1) await first.promise
			await set(values, context)
		})
		const state = observable({ width: 320, other: 1 })
		const item = binding(state, [
			{ path: ['width'], parser: paramNumber() },
			{ path: ['other'], parser: paramNumber() },
		])
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		state.width = 400
		await tick()
		state.width = 500
		state.other = 2
		await tick()
		state.width = 600
		await tick()
		const fence = engine.flush()
		expect(saved.port.set).toHaveBeenCalledTimes(1)
		first.resolve(undefined)
		await fence
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('600')
		expect(decodeRecord(saved.values.get(key('other')) ?? '').value).toBe('2')
		engine.dispose()
	})

	it('retains dirty state after sync failure and flush retries the latest value', async () => {
		const saved = memory()
		const set = saved.port.set
		let fail = true
		saved.port.set = (values, context) => {
			if (fail) throw new Error('offline')
			return set(values, context)
		}
		const onError = vi.fn()
		const engine = createPersistEngine(saved.port, { source: 'server', onError })
		const state = observable({ width: 320 })
		const item = binding(state)
		engine.connect(item)
		state.width = 400
		await expect(engine.flush()).rejects.toThrow('offline')
		expect(item.status.dirty).toBe(true)
		expect(onError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ source: 'server', operation: 'write', address: { store: id(), field: ['width'] } }),
		)
		state.width = 500
		fail = false
		await engine.flush()
		expect(item.status.dirty).toBe(false)
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		engine.dispose()
	})

	it('resets after an in-flight write and before a later user write', async () => {
		const first = deferred<undefined>()
		const saved = memory()
		const set = saved.port.set
		let count = 0
		saved.port.set = async (values: Keyed, context: CommitCtx) => {
			if (++count === 1) await first.promise
			await set(values, context)
		}
		const state = observable({ width: 320 })
		const item = binding(state)
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		state.width = 400
		await tick()
		state.width = 500
		await tick()
		const reset = engine.reset(item)
		expect(state.width).toBe(320)
		state.width = 600
		await tick()
		const flushed = engine.flush()
		first.resolve(undefined)
		await reset
		await flushed
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('600')
		expect(count).toBe(3)
		engine.dispose()
	})

	it('resets original nested defaults without touching another field', async () => {
		const state = observable({ layout: { width: 320 }, other: 1 })
		const saved = memory()
		const item = binding(state, [
			{ path: ['layout'], parser: paramJson() },
			{ path: ['other'], parser: paramNumber() },
		])
		const engine = createPersistEngine(saved.port)
		engine.connect(item)
		state.layout.width = 500
		state.other = 2
		await engine.reset(item, [['layout']])
		await engine.flush()
		expect(state.layout).toEqual({ width: 320 })
		expect(state.other).toBe(2)
		expect(saved.values.has(key('layout'))).toBe(false)
		state.layout.width = 900
		await engine.reset(item, [['layout']])
		expect(state.layout.width).toBe(320)
		engine.dispose()
	})

	it('clears full scope including closed records, preserves siblings and rejects stale reads', async () => {
		const read = deferred<Keyed>()
		const saved = memory(
			new Map([
				[key(), encodeRecord('800')],
				[key('width', 'closed'), encodeRecord('700')],
				[key('width', 'workspace', ['devices-old']), encodeRecord('900')],
			]),
		)
		const initial = new Map(saved.values)
		saved.port.get = () => read.promise
		const state = observable({ width: 320 })
		const engine = createPersistEngine(saved.port)
		engine.connect(binding(state))
		await engine.resetScope(['devices'])
		read.resolve(initial)
		await tick()
		expect(state.width).toBe(320)
		expect([...saved.values.keys()]).toEqual([key('width', 'workspace', ['devices-old'])])
		engine.dispose()
	})

	it('holds newly mounted records behind a pending scope reset', async () => {
		const deletion = deferred<undefined>()
		const saved = memory(new Map([[key(), encodeRecord('800')]]))
		const remove = saved.port.removeScope
		if (!remove) throw new Error('Missing scope deletion')
		saved.port.removeScope = async (path) => {
			await deletion.promise
			await remove(path)
		}
		const engine = createPersistEngine(saved.port)
		const reset = engine.resetScope(['devices'])
		const state = observable({ width: 320 })
		engine.connect(binding(state))
		expect(saved.port.get).not.toHaveBeenCalled()
		deletion.resolve(undefined)
		await reset
		expect(state.width).toBe(320)
		engine.dispose()
	})
})
