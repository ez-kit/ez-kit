import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { applyKeyed, ApplyMode, createBinding } from './binding'
import { paramString } from './codecs'
import { createPersistEngine } from './engine'

import type { Keyed, SourcePort } from './types'

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** An async port whose `get()` resolves only after `release()` — models a late IndexedDB read. */
function deferredPort(value: Keyed): { port: SourcePort; release: () => void } {
	let release: () => void = () => undefined
	const gate = new Promise<void>((resolve) => {
		release = resolve
	})
	const port: SourcePort = {
		get: async () => {
			await gate
			return value
		},
		set: () => Promise.resolve(),
	}
	return { port, release }
}

describe('@ez-kit/va-store persist async hydration', () => {
	it('awaits an async get() and fills fields still at their default', async () => {
		const state = proxy({ q: '' })
		const binding = createBinding(state, [{ path: ['q'], parser: paramString() }], {})
		const { port, release } = deferredPort(new Map([['q', 'fromIdb']]))

		createPersistEngine(port).connect(binding)
		expect(state.q).toBe('') // still default — get() has not resolved yet

		release()
		await tick()
		expect(state.q).toBe('fromIdb')
	})

	it('does not clobber a field another source already set (first-present-wins)', async () => {
		const state = proxy({ q: '', sort: '' })
		const binding = createBinding(
			state,
			[
				{ path: ['q'], parser: paramString() },
				{ path: ['sort'], parser: paramString() },
			],
			{},
		)

		// Simulate a synchronous source (URL) winning first: `q` moves off its default.
		applyKeyed(binding, new Map([['q', 'shoes']]), ApplyMode.Hydrate)
		expect(state.q).toBe('shoes')

		// A late IndexedDB read carrying a stale `q` plus a fresh `sort`.
		const { port, release } = deferredPort(
			new Map([
				['q', 'cached'],
				['sort', 'asc'],
			]),
		)
		createPersistEngine(port).connect(binding)

		release()
		await tick()

		// `q` keeps the earlier (URL) value; only the still-default `sort` is filled by IDB.
		expect(state.q).toBe('shoes')
		expect(state.sort).toBe('asc')
	})

	it('flushes proxy mutations to an async set() without blocking', async () => {
		const state = proxy({ q: '' })
		const binding = createBinding(state, [{ path: ['q'], parser: paramString() }], {})
		const setSpy = vi.fn(() => Promise.resolve())
		const port: SourcePort = { get: () => Promise.resolve(new Map()), set: setSpy }

		createPersistEngine(port).connect(binding)
		await tick() // let the initial (empty) hydrate settle

		state.q = 'boots'
		await tick()

		expect(setSpy).toHaveBeenCalledTimes(1)
		const [desired] = setSpy.mock.calls[0] as unknown as [Keyed]
		expect(desired.get('q')).toBe('boots')
	})
})
