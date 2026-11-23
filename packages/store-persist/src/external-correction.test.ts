import { afterEach, describe, expect, it, vi } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from './binding'
import { paramNumber } from './codecs'
import { createPersistEngine } from './engine'
import { SourceMutationCancelledError } from './source-errors'
import { objectPort, observable } from './test-kit'

import type { PersistEngine } from './engine'
import type { CommitCtx, Keyed } from './types'

function deferred() {
	let resolve!: () => void
	let reject!: (error: unknown) => void
	const promise = new Promise<void>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
async function tick() {
	for (let i = 0; i < 20; i++) await Promise.resolve()
}
const engines: PersistEngine[] = []
afterEach(() => {
	for (const engine of engines.splice(0)) engine.dispose()
	vi.useRealTimers()
})
function fixture() {
	let source: Keyed = new Map()
	const first = deferred()
	const writes: { desired: Keyed; context: CommitCtx }[] = []
	const engine = createPersistEngine({
		get: () => new Map(source),
		set: (desired, context) => {
			writes.push({ desired: new Map(desired), context })
			return writes.length === 1 ? first.promise : undefined
		},
	})
	engines.push(engine)
	const state = observable({ width: 320, page: 1 })
	const binding = createBinding(
		state,
		objectPort,
		[
			{ path: ['width'], parser: paramNumber() },
			{ path: ['page'], parser: paramNumber() },
		],
		{},
	)
	captureDefaults(binding)
	addressBinding(binding, { path: [], name: 'panel', id: 'one' })
	engine.connect(binding)
	const keys = [...binding.keyOf.values()]
	const widthKey = keys[0]
	const pageKey = keys[1]
	if (widthKey === undefined || pageKey === undefined) throw new Error('Missing fixture keys')
	return {
		engine,
		state,
		binding,
		first,
		writes,
		widthKey,
		pageKey,
		external(width: number) {
			source = new Map([[widthKey, String(width)]])
			engine.pullSource()
		},
	}
}

describe('external corrections after mutation outcomes', () => {
	it('cancels an unsent external correction and its captured waiter when the original command did not commit', async () => {
		const app = fixture()
		app.state.width = 500
		const originalResult = app.engine.flush(app.binding).then(
			() => null,
			(error: unknown) => error,
		)
		app.external(700)
		let correctionSettled = false
		const correction = app.engine
			.flush(app.binding)
			.then(
				() => null,
				(error: unknown) => error,
			)
			.then((result) => {
				correctionSettled = true
				return result
			})
		expect(app.state.width).toBe(700)
		expect(app.writes).toHaveLength(1)
		app.first.reject(new SourceMutationCancelledError())
		await tick()
		expect(await originalResult).toBeInstanceOf(SourceMutationCancelledError)
		expect(correctionSettled).toBe(true)
		expect(await correction).toBeInstanceOf(SourceMutationCancelledError)
		expect(app.writes).toHaveLength(1)
		expect(app.binding.status.dirty).toBe(false)
		await app.engine.flush(app.binding)
		expect(app.writes).toHaveLength(1)
	})
	it('preserves a newer user edit and its metadata after the external correction is superseded', async () => {
		const app = fixture()
		app.state.width = 500
		const original = app.engine.flush(app.binding).catch(() => undefined)
		app.external(700)
		app.engine.runWithMeta({ history: 'push' }, () => {
			app.state.width = 900
		})
		let saved = false
		const current = app.engine.flush(app.binding).then(() => {
			saved = true
		})
		app.first.reject(new SourceMutationCancelledError())
		await original
		await current
		expect(saved).toBe(true)
		expect(app.state.width).toBe(900)
		expect(app.writes).toHaveLength(2)
		expect(app.writes[1]?.desired.get(app.widthKey)).toBe('900')
		expect(app.writes[1]?.context.meta).toEqual({ history: 'push' })
		expect(app.binding.status.dirty).toBe(false)
	})
	it('preserves a newer user edit that returns to the external value', async () => {
		const app = fixture()
		app.state.width = 500
		const original = app.engine.flush(app.binding).catch(() => undefined)
		app.external(700)
		app.state.width = 900
		app.state.width = 700
		const current = app.engine.flush(app.binding)
		app.first.reject(new SourceMutationCancelledError())
		await original
		await current
		expect(app.writes).toHaveLength(2)
		expect(app.writes[1]?.desired.get(app.widthKey)).toBe('700')
	})
	it('does not discard an unrelated dirty field while cancelling the correction', async () => {
		const app = fixture()
		app.state.width = 500
		const original = app.engine.flush(app.binding).catch(() => undefined)
		app.external(700)
		app.state.page = 2
		const current = app.engine.flush(app.binding).then(
			() => null,
			(error: unknown) => error,
		)
		app.first.reject(new SourceMutationCancelledError())
		await original
		expect(await current).toBeInstanceOf(SourceMutationCancelledError)
		await app.engine.flush(app.binding)
		expect(app.writes).toHaveLength(2)
		expect(app.writes[1]?.desired.has(app.widthKey)).toBe(false)
		expect(app.writes[1]?.desired.get(app.pageKey)).toBe('2')
		expect(app.state.width).toBe(700)
	})
	it.each(['acknowledged', 'failed'] as const)(
		'keeps the correction when the sent write is %s without proven cancellation',
		async (outcome) => {
			const app = fixture()
			app.state.width = 500
			const original = app.engine.flush(app.binding).catch(() => undefined)
			app.external(700)
			const current = app.engine.flush(app.binding)
			if (outcome === 'acknowledged') app.first.resolve()
			else app.first.reject(new Error('uncertain write outcome'))
			await original
			await current
			expect(app.writes).toHaveLength(2)
			expect(app.writes[1]?.desired.get(app.widthKey)).toBe('700')
			expect(app.binding.status.dirty).toBe(false)
		},
	)
})
