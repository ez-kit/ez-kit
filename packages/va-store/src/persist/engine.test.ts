import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createBinding, type PersistBinding } from './binding'
import { createPersistEngine, type CreateEngineOptions } from './engine'

import type { CommitCtx, FieldDescriptor, Keyed, MetaMerge, Parser, SourcePort, PersistOptions } from './types'

const str: Parser<string> = { parse: (r) => r, stringify: (v) => v }
const num: Parser<number> = { parse: (r) => Number(r), stringify: (v) => String(v) }

function keyed(entries: Record<string, string>): Keyed {
	return new Map(Object.entries(entries))
}

function fakePort() {
	let store: Keyed = new Map()
	const calls: { desired: Keyed; ctx: CommitCtx }[] = []
	const port: SourcePort = {
		get: () => new Map(store),
		set: (desired, ctx) => {
			store = new Map(desired)
			calls.push({ desired: new Map(desired), ctx })
		},
	}
	return {
		port,
		calls,
		setExternal: (next: Keyed) => {
			store = new Map(next)
		},
		get store() {
			return store
		},
	}
}

function bind(store: object, fields: FieldDescriptor[], options: PersistOptions = {}): PersistBinding {
	return createBinding(store, fields, options)
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('@ez-kit/va-store persist engine', () => {
	it('hydrates the proxy from the substrate on connect', () => {
		const fake = fakePort()
		fake.setExternal(keyed({ q: 'shoes' }))
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })

		engine.connect(bind(store, [{ path: ['q'], parser: str }]))

		expect(store.q).toBe('shoes')
		engine.dispose()
	})

	it('writes a proxy change once and terminates the loop', async () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }]))

		store.q = 'shoes'
		await tick()

		expect(fake.store.get('q')).toBe('shoes')
		expect(fake.calls).toHaveLength(1)

		engine.pull(keyed({ q: 'shoes' }))
		await tick()
		expect(fake.calls).toHaveLength(1)
		engine.dispose()
	})

	it('pull updates the proxy without writing the substrate (back-button safe)', async () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const store = proxy({ id: 1 })
		engine.connect(bind(store, [{ path: ['id'], parser: num }]))

		engine.pull(keyed({ id: '9' }))
		await tick()

		expect(store.id).toBe(9)
		expect(fake.calls).toHaveLength(0)
		engine.dispose()
	})

	it('coalesces changes from multiple bindings into one commit', async () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const a = proxy({ q: '' })
		const b = proxy({ items: 0 })
		engine.connect(bind(a, [{ path: ['q'], parser: str }]))
		engine.connect(bind(b, [{ path: ['items'], parser: num }]))

		a.q = 'a'
		b.items = 3
		await tick()

		expect(fake.calls).toHaveLength(1)
		expect(fake.store.get('q')).toBe('a')
		expect(fake.store.get('items')).toBe('3')
		engine.dispose()
	})

	it('removes a key when its value returns to the default', async () => {
		const fake = fakePort()
		fake.setExternal(keyed({ q: 'shoes' }))
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }]))

		store.q = ''
		await tick()

		expect(fake.store.has('q')).toBe(false)
		expect(fake.calls.at(-1)?.ctx.diff.removed).toContain('q')
		engine.dispose()
	})

	it('reports added/changed keys in the commit diff', async () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }]))

		store.q = 'shoes'
		await tick()

		expect(fake.calls.at(-1)?.ctx.diff.set).toContain('q')
		engine.dispose()
	})

	it('carries default meta and applies a custom meta merge', async () => {
		const historyOf = (meta: unknown): string | undefined =>
			meta !== null && typeof meta === 'object' && 'history' in meta
				? (meta as { history?: string }).history
				: undefined
		// URL-style merge: any push in the batch wins over replace.
		const mergeMeta: MetaMerge = (prev, next) => {
			const history = historyOf(prev) === 'push' ? 'push' : historyOf(next)
			return history === undefined ? {} : { history }
		}
		const options: CreateEngineOptions = { mergeMeta, defaultMeta: { history: 'replace' } }
		const fake = fakePort()
		const engine = createPersistEngine(fake.port, options)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }]))

		store.q = 'plain'
		await tick()
		expect(fake.calls.at(-1)?.ctx.meta).toMatchObject({ history: 'replace' })

		engine.runWithMeta({ history: 'push' }, () => {
			store.q = 'pushed'
		})
		await tick()
		expect(fake.calls.at(-1)?.ctx.meta).toMatchObject({ history: 'push' })
		engine.dispose()
	})

	it('throttles commits and coalesces rapid changes into one', async () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }], { throttleMs: 20 }))

		store.q = 'a'
		store.q = 'b'
		store.q = 'c'
		await new Promise((resolve) => setTimeout(resolve, 40))

		expect(fake.calls).toHaveLength(1)
		expect(fake.store.get('q')).toBe('c')
		engine.dispose()
	})

	it('flushNow bypasses the throttle window', () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }], { throttleMs: 1000 }))

		store.q = 'now'
		engine.flushNow()

		expect(fake.calls).toHaveLength(1)
		expect(fake.store.get('q')).toBe('now')
		engine.dispose()
	})

	it('hydrates from an async port', async () => {
		let store: Keyed = keyed({ q: 'async' })
		const calls: Keyed[] = []
		const port: SourcePort = {
			get: () => Promise.resolve(new Map(store)),
			set: (desired) => {
				store = new Map(desired)
				calls.push(new Map(desired))
			},
		}
		const engine = createPersistEngine(port)
		const proxied = proxy({ q: '' })
		engine.connect(bind(proxied, [{ path: ['q'], parser: str }]))

		expect(proxied.q).toBe('')
		await tick()
		expect(proxied.q).toBe('async')
		engine.dispose()
	})

	it('stops committing after dispose', async () => {
		const fake = fakePort()
		const engine = createPersistEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: str }]))

		engine.dispose()
		store.q = 'after-dispose'
		await tick()

		expect(fake.calls).toHaveLength(0)
	})

	it('first-present-wins: the earlier source keeps a shared key against a later source', () => {
		// Two sources (e.g. url + storage), two bindings over one proxy. Both bindings capture their
		// default (`''`) at construction, before any hydration — this is what makes the guard work.
		const store = proxy({ q: '' })
		const urlField: FieldDescriptor = { path: ['q'], parser: str }
		const storageField: FieldDescriptor = { path: ['q'], parser: str }
		const urlBinding = bind(store, [urlField])
		const storageBinding = bind(store, [storageField])

		const url = fakePort()
		url.setExternal(keyed({ q: 'fromUrl' }))
		const storage = fakePort()
		storage.setExternal(keyed({ q: 'fromStorage' }))

		const urlEngine = createPersistEngine(url.port)
		const storageEngine = createPersistEngine(storage.port)

		// URL connects first and wins the shared field; storage then fills only gaps.
		urlEngine.connect(urlBinding)
		storageEngine.connect(storageBinding)

		expect(store.q).toBe('fromUrl')
		urlEngine.dispose()
		storageEngine.dispose()
	})
})
