import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { paramNumber, paramString } from '../codecs'
import { SearchParamsHistory } from '../types'

import { createBinding, type SyncBinding } from './binding'
import { createSyncEngine, type EnginePort } from './engine'

import type { FieldDescriptor, SearchParamsOptions } from '../types'

function createFakePort() {
	let params = new URLSearchParams()
	const calls: { search: string; history: string }[] = []
	const port: EnginePort = {
		getSnapshot: () => new URLSearchParams(params),
		updateSearchParams: (next, options) => {
			params = new URLSearchParams(next)
			calls.push({ search: params.toString(), history: options.history })
		},
	}
	return {
		port,
		calls,
		setExternal: (search: string) => {
			params = new URLSearchParams(search)
		},
		get search() {
			return params.toString()
		},
	}
}

function bind(store: object, fields: FieldDescriptor[], options: SearchParamsOptions = {}): SyncBinding {
	return createBinding(store, fields, options)
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('@ez-kit/valtio-kit sync engine', () => {
	it('hydrates the proxy from the URL on connect (URL wins over default)', () => {
		const fake = createFakePort()
		fake.setExternal('?q=shoes')
		const engine = createSyncEngine(fake.port)
		const store = proxy({ q: '' })

		engine.connect(bind(store, [{ path: ['q'], parser: paramString() }]))

		expect(store.q).toBe('shoes')
		engine.dispose()
	})

	it('writes proxy changes to the URL once and terminates the loop', async () => {
		const fake = createFakePort()
		const engine = createSyncEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: paramString() }]))

		store.q = 'shoes'
		await flush()

		expect(fake.search).toBe('q=shoes')
		expect(fake.calls).toHaveLength(1)

		engine.pull(new URLSearchParams(fake.search))
		await flush()
		expect(fake.calls).toHaveLength(1)
		engine.dispose()
	})

	it('pull updates the proxy without writing the URL (back-button safe)', async () => {
		const fake = createFakePort()
		const engine = createSyncEngine(fake.port)
		const store = proxy({ id: 1 })
		engine.connect(bind(store, [{ path: ['id'], parser: paramNumber() }]))

		fake.setExternal('?id=9')
		engine.pull(new URLSearchParams('?id=9'))
		await flush()

		expect(store.id).toBe(9)
		expect(fake.calls).toHaveLength(0)
		engine.dispose()
	})

	it('coalesces changes from multiple stores into one navigation', async () => {
		const fake = createFakePort()
		const engine = createSyncEngine(fake.port)
		const a = proxy({ q: '' })
		const b = proxy({ items: 0 })
		engine.connect(bind(a, [{ path: ['q'], parser: paramString() }]))
		engine.connect(bind(b, [{ path: ['items'], parser: paramNumber() }]))

		a.q = 'a'
		b.items = 3
		await flush()

		expect(fake.calls).toHaveLength(1)
		const result = new URLSearchParams(fake.search)
		expect(result.get('q')).toBe('a')
		expect(result.get('items')).toBe('3')
		engine.dispose()
	})

	it('clears a param when its value returns to the default', async () => {
		const fake = createFakePort()
		fake.setExternal('?q=shoes')
		const engine = createSyncEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: paramString() }]))

		store.q = ''
		await flush()

		expect(fake.search).toBe('')
		engine.dispose()
	})

	it('pushes a history entry when runWithHistory("push") is used', async () => {
		const fake = createFakePort()
		const engine = createSyncEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: paramString() }]))

		engine.runWithHistory(SearchParamsHistory.Push, () => {
			store.q = 'shoes'
		})
		await flush()

		expect(fake.calls).toHaveLength(1)
		expect(fake.calls[0]?.history).toBe(SearchParamsHistory.Push)
		engine.dispose()
	})

	it('defaults to replace history', async () => {
		const fake = createFakePort()
		const engine = createSyncEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: paramString() }]))

		store.q = 'shoes'
		await flush()

		expect(fake.calls[0]?.history).toBe(SearchParamsHistory.Replace)
		engine.dispose()
	})

	it('preserves foreign params it does not own', async () => {
		const fake = createFakePort()
		fake.setExternal('?theme=dark')
		const engine = createSyncEngine(fake.port)
		const store = proxy({ q: '' })
		engine.connect(bind(store, [{ path: ['q'], parser: paramString() }]))

		store.q = 'shoes'
		await flush()

		const result = new URLSearchParams(fake.search)
		expect(result.get('theme')).toBe('dark')
		expect(result.get('q')).toBe('shoes')
		engine.dispose()
	})
})
