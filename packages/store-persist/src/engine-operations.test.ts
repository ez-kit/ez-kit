import { serializePersistAddress } from '@ez-kit/store-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from './binding'
import { paramNumber } from './codecs'
import { createPersistEngine } from './engine'
import { decodeRecord, encodeRecord } from './record'
import { SourceMutationCancelledError } from './source-errors'
import { patchKeyed, removeKeyedScope } from './storage/patch'
import { objectPort, observable } from './test-kit'
import { createUrlPort, UrlHistory } from './url/adapter'

import type { CommitCtx, Keyed, SourcePort } from './types'

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
async function tick(): Promise<void> {
	for (let i = 0; i < 10; i++) await Promise.resolve(undefined)
}
const storeId = (id: string, path = ['devices']) => ({ path, name: 'panel', id })
const key = (id = 'one', path = ['devices']) => serializePersistAddress({ store: storeId(id, path), field: ['width'] })
function bind(state: object, { id = 'one', path = ['devices'], throttleMs = 0 } = {}) {
	const binding = createBinding(state, objectPort, [{ path: ['width'], parser: paramNumber() }], { throttleMs })
	captureDefaults(binding)
	addressBinding(binding, storeId(id, path))
	return binding
}
function memory(initial: Keyed = new Map()) {
	let values = new Map(initial)
	const port: SourcePort = {
		capabilities: { recordVersions: true },
		get: () => new Map(values),
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
afterEach(() => {
	vi.useRealTimers()
})

describe('acknowledged source operations', () => {
	it('keeps each repeated reset pending until its real deletion acknowledgement', async () => {
		const original = deferred<undefined>()
		const firstDelete = deferred<undefined>()
		const secondDelete = deferred<undefined>()
		const saved = memory()
		const commit = saved.port.set
		let calls = 0
		saved.port.set = async (desired, context) => {
			const gate = [original, firstDelete, secondDelete][calls++]
			await gate?.promise
			await commit(desired, context)
		}
		const engine = createPersistEngine(saved.port)
		const state = observable({ width: 320 })
		const target = bind(state)
		engine.connect(target)
		state.width = 500
		await tick()
		let firstDone = false
		let secondDone = false
		const first = engine.reset(target).then(() => {
			firstDone = true
		})
		const second = engine.reset(target).then(() => {
			secondDone = true
		})
		original.resolve(undefined)
		await tick()
		expect(calls).toBe(2)
		expect(saved.values.has(key())).toBe(true)
		expect(firstDone).toBe(false)
		expect(secondDone).toBe(false)
		firstDelete.resolve(undefined)
		await first
		expect(saved.values.has(key())).toBe(false)
		expect(secondDone).toBe(false)
		secondDelete.resolve(undefined)
		await second
		engine.dispose()
	})

	it('includes container rewrite acknowledgement and failure in flush and status', async () => {
		const first = deferred<undefined>()
		const retry = deferred<undefined>()
		const report = vi.fn()
		let writes = 0
		const port: SourcePort = {
			get(context) {
				context?.stageContainerRewrite?.(new Map([['legacy', 'value']]))
				return new Map()
			},
			set: vi.fn(),
			rewriteContainer: vi.fn(() => (writes++ === 0 ? first.promise : retry.promise)),
		}
		const engine = createPersistEngine(port, { source: 'server', onError: report })
		const state = observable({ width: 320 })
		const target = bind(state)
		engine.connect(target)
		expect(target.status).toMatchObject({ restore: 'ready', write: 'pending', dirty: false })
		let flushed = false
		const flush = engine.flush(target).then(() => {
			flushed = true
		})
		await tick()
		expect(flushed).toBe(false)
		first.reject(new Error('rewrite failed'))
		await expect(flush).rejects.toThrow('rewrite failed')
		expect(target.status).toMatchObject({ write: 'error', dirty: false })
		expect(report).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ source: 'server', operation: 'write' }),
		)
		const retried = engine.flush(target)
		await tick()
		expect(writes).toBe(2)
		retry.resolve(undefined)
		await retried
		expect(target.status).toMatchObject({ write: 'idle', error: null })
		expect(port.set).not.toHaveBeenCalled()
		engine.dispose()
	})

	it('reports a missing dedicated container rewrite capability instead of using patch metadata', async () => {
		const set = vi.fn()
		const report = vi.fn()
		const engine = createPersistEngine(
			{
				get(context) {
					context?.stageContainerRewrite?.(new Map())
					return new Map()
				},
				set,
			},
			{ onError: report },
		)
		const target = bind(observable({ width: 320 }))
		engine.connect(target)
		expect(target.status.error).toBeInstanceOf(Error)
		await expect(engine.flush(target)).rejects.toThrow('does not support container rewrites')
		expect(set).not.toHaveBeenCalled()
		expect(report).toHaveBeenCalled()
		engine.dispose()
	})

	it('flush waits for a namespace delete even when no records are currently connected', async () => {
		const deletion = deferred<undefined>()
		const engine = createPersistEngine({
			get: () => new Map(),
			set: () => undefined,
			removeScope: () => deletion.promise,
		})
		const reset = engine.resetScope(['closed'])
		let done = false
		const flush = engine.flush().then(() => {
			done = true
		})
		await tick()
		expect(done).toBe(false)
		deletion.resolve(undefined)
		await Promise.all([reset, flush])
		engine.dispose()
	})

	it('a failed scope blocks only its own edits and is not retried by an unrelated binding flush', async () => {
		const saved = memory()
		let deletes = 0
		saved.port.removeScope = () => {
			deletes++
			throw new Error('offline a')
		}
		const engine = createPersistEngine(saved.port)
		const a = observable({ width: 320 })
		const b = observable({ width: 320 })
		const targetA = bind(a, { path: ['a'] })
		const targetB = bind(b, { path: ['b'] })
		engine.connect(targetA)
		engine.connect(targetB)
		await expect(engine.resetScope(['a'])).rejects.toThrow('offline a')
		a.width = 500
		await tick()
		b.width = 600
		await tick()
		await engine.flush(targetB)
		expect(deletes).toBe(1)
		expect(decodeRecord(saved.values.get(key('one', ['b'])) ?? '').value).toBe('600')
		expect(saved.values.has(key('one', ['a']))).toBe(false)
		engine.dispose()
	})

	it('collects an edit before disconnect removes a throttled binding and retains a failed edit for source retry', async () => {
		vi.useFakeTimers()
		const saved = memory()
		const write = saved.port.set
		let fail = true
		saved.port.set = (desired, context) => {
			if (fail) {
				fail = false
				throw new Error('offline')
			}
			return write(desired, context)
		}
		const engine = createPersistEngine(saved.port)
		const state = observable({ width: 320 })
		const target = bind(state, { throttleMs: 5000 })
		const disconnect = engine.connect(target)
		state.width = 500
		disconnect()
		expect(target.status.dirty).toBe(true)
		await engine.flush()
		expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
		await vi.advanceTimersByTimeAsync(5000)
		expect(write).toHaveBeenCalledTimes(1)
		engine.dispose()
	})

	it('does not let an idle slow binding delay quick saves or flush another binding deadline early', async () => {
		vi.useFakeTimers()
		const saved = memory()
		const engine = createPersistEngine(saved.port)
		const fast = observable({ width: 320 })
		const slow = observable({ width: 320 })
		const quick = bind(fast, { id: 'quick' })
		const delayed = bind(slow, { id: 'slow', throttleMs: 5000 })
		engine.connect(quick)
		engine.connect(delayed)
		fast.width = 500
		await vi.advanceTimersByTimeAsync(0)
		expect(decodeRecord(saved.values.get(key('quick')) ?? '').value).toBe('500')
		slow.width = 700
		fast.width = 600
		await engine.flush(quick)
		expect(saved.values.has(key('slow'))).toBe(false)
		await vi.advanceTimersByTimeAsync(4999)
		expect(saved.values.has(key('slow'))).toBe(false)
		await vi.advanceTimersByTimeAsync(1)
		expect(decodeRecord(saved.values.get(key('slow')) ?? '').value).toBe('700')
		engine.dispose()
	})

	it.each([NaN, Infinity, -Infinity, -20])(
		'treats unsafe throttle %s as immediate without unbounded microtasks',
		(throttleMs) => {
			const callbacks: (() => void)[] = []
			const microtasks = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
				callbacks.push(callback)
			})
			const saved = memory()
			const engine = createPersistEngine(saved.port)
			try {
				const state = observable({ width: 320 })
				engine.connect(bind(state, { throttleMs }))
				state.width = 500
				// Drain a bounded fake microtask queue so a regression cannot starve the test runner.
				for (let count = 0; count < 4; count++) {
					const callback = callbacks.shift()
					if (!callback) break
					callback()
				}
				expect(decodeRecord(saved.values.get(key()) ?? '').value).toBe('500')
				expect(callbacks).toHaveLength(0)
			} finally {
				engine.dispose()
				microtasks.mockRestore()
			}
		},
	)

	it('keeps runWithMeta attached to its slow record instead of another binding deadline', async () => {
		vi.useFakeTimers()
		const calls: CommitCtx[] = []
		const engine = createPersistEngine(
			{
				get: () => new Map(),
				set(_values, context) {
					calls.push(context)
				},
			},
			{ defaultMeta: { history: 'replace' } },
		)
		const slow = observable({ width: 320 })
		const fast = observable({ width: 320 })
		engine.connect(bind(slow, { id: 'slow', throttleMs: 5000 }))
		engine.connect(bind(fast, { id: 'fast' }))
		engine.runWithMeta({ history: 'push' }, () => {
			slow.width = 500
		})
		fast.width = 600
		await vi.advanceTimersByTimeAsync(0)
		expect(calls).toHaveLength(1)
		expect(calls[0]?.meta).toEqual({ history: 'replace' })
		await vi.advanceTimersByTimeAsync(5000)
		expect(calls[1]?.meta).toEqual({ history: 'push' })
		engine.dispose()
	})

	it('recomputes metadata after superseded entries leave a coalesced patch', async () => {
		const gate = deferred<undefined>()
		const calls: CommitCtx[] = []
		const engine = createPersistEngine(
			{
				get: () => new Map(),
				set(_values, context) {
					calls.push(context)
					if (calls.length === 1) return gate.promise
				},
			},
			{ defaultMeta: { history: 'replace' } },
		)
		const first = observable({ width: 320 })
		const a = observable({ width: 320 })
		const b = observable({ width: 320 })
		engine.connect(bind(first, { id: 'first' }))
		engine.connect(bind(a, { id: 'a' }))
		engine.connect(bind(b, { id: 'b' }))
		first.width = 400
		await tick()
		engine.runWithMeta({ history: 'push' }, () => {
			a.width = 500
		})
		b.width = 600
		await tick()
		a.width = 700
		await tick()
		gate.resolve(undefined)
		await engine.flush()
		expect(calls).toHaveLength(3)
		expect(calls[1]?.diff.set).toEqual([key('b')])
		expect(calls[1]?.meta).toEqual({ history: 'replace' })
		expect(calls[2]?.diff.set).toEqual([key('a')])
		expect(calls[2]?.meta).toEqual({ history: 'push' })
		engine.dispose()
	})

	it('preserves a synchronous rewrite failure after restore becomes ready', () => {
		const failure = new Error('sync rewrite failure')
		const engine = createPersistEngine({
			get(context) {
				context?.stageContainerRewrite?.(new Map())
				return new Map()
			},
			set: () => undefined,
			rewriteContainer() {
				throw failure
			},
		})
		const target = bind(observable({ width: 320 }))
		engine.connect(target)
		expect(target.status).toMatchObject({ restore: 'ready', write: 'error', error: failure })
		engine.dispose()
	})

	it.each(['width=bad', 'width=001'])('keeps seed-only render maintenance pure until connection: %s', async (query) => {
		let search = new URLSearchParams(query)
		const commit = vi.fn((next: URLSearchParams) => {
			search = next
		})
		const port = createUrlPort({ read: () => search, commit })
		const read = vi.spyOn(port, 'get')
		const renderRead = vi.spyOn(port, 'getRenderSnapshot')
		const engine = createPersistEngine(port, { ssrSafe: true })
		const target = bind(observable({ width: 320 }))
		engine.seed(target)
		await tick()
		expect(commit).not.toHaveBeenCalled()
		// SSR and an abandoned render stop here. Only committed connection may send maintenance.
		engine.connect(target)
		await tick()
		expect(read).not.toHaveBeenCalled()
		expect(renderRead).toHaveBeenCalledTimes(1)
		expect(commit).toHaveBeenCalledTimes(1)
		expect(search.toString()).toBe(query === 'width=bad' ? '' : 'width=1')
		engine.dispose()
	})

	it.each(['width=640', ''])('Back to %s cancels throttled user intent without history echo', async (location) => {
		vi.useFakeTimers()
		let search = new URLSearchParams('width=400')
		const commit = vi.fn((next: URLSearchParams) => {
			search = next
		})
		const engine = createPersistEngine(createUrlPort({ read: () => search, commit }))
		const state = observable({ width: 320 })
		const target = bind(state, { throttleMs: 5000 })
		engine.connect(target)
		engine.runWithMeta({ history: UrlHistory.Push }, () => {
			state.width = 500
		})
		expect(target.status.dirty).toBe(true)
		search = new URLSearchParams(location)
		engine.pullSource()
		expect(state.width).toBe(location ? 640 : 320)
		expect(target.status.dirty).toBe(false)
		await vi.advanceTimersByTimeAsync(5000)
		await engine.flush(target)
		expect(commit).not.toHaveBeenCalled()
		expect(search.toString()).toBe(location)
		engine.dispose()
	})

	it('external values cancel queued user writes while preserving other pending records', async () => {
		const gate = deferred<undefined>()
		const calls: { values: Keyed; context: CommitCtx }[] = []
		const engine = createPersistEngine({
			get: () => new Map(),
			set(values, context) {
				calls.push({ values, context })
				if (calls.length === 1) return gate.promise
			},
		})
		const first = observable({ width: 320 })
		const state = observable({ width: 320 })
		engine.connect(bind(first, { id: 'first' }))
		const target = bind(state)
		engine.connect(target)
		first.width = 400
		await tick()
		engine.runWithMeta({ history: 'push' }, () => {
			state.width = 500
		})
		await tick()
		const waiting = expect(engine.flush(target)).rejects.toBeInstanceOf(SourceMutationCancelledError)
		engine.pull(
			new Map([
				[key('first'), '400'],
				[key(), '640'],
			]),
		)
		await waiting
		expect(state.width).toBe(640)
		expect(target.status.dirty).toBe(false)
		gate.resolve(undefined)
		await tick()
		expect(calls.filter((call) => call.values.has(key()))).toHaveLength(0)
		engine.dispose()
	})

	it('a newer valid restore cancels obsolete invalidation rather than deleting the valid value', async () => {
		vi.useFakeTimers()
		let values = new Map([[key(), encodeRecord('bad')]])
		const engine = createPersistEngine({
			capabilities: { recordVersions: true },
			get: () => new Map(values),
			set(desired, context) {
				values = patchKeyed(values, desired, context)
			},
		})
		const state = observable({ width: 320 })
		const target = bind(state, { throttleMs: 5000 })
		engine.connect(target)
		expect(target.status.records?.[0]?.outcome).toBe('invalidated')
		values = new Map([[key(), encodeRecord('640')]])
		await engine.restore(target)
		await engine.flush(target)
		expect(state.width).toBe(640)
		expect(decodeRecord(values.get(key()) ?? '').value).toBe('640')
		expect(target.status).toMatchObject({ dirty: false, write: 'idle' })
		engine.dispose()
	})
})
