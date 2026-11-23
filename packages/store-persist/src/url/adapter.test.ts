import { describe, expect, it } from 'vitest'

import { createBinding } from '../binding'
import { createPersistEngine } from '../engine'
import { objectPort, observable } from '../test-kit'

import { createUrlPort, UrlHistory, urlMetaMerge, type UrlDriver } from './adapter'

import type { FieldDescriptor, Keyed, Parser } from '../types'

const str: Parser<string> = { parse: (r) => r, stringify: (v) => v }
const num: Parser<number> = { parse: (r) => Number(r), stringify: (v) => String(v) }

function fakeDriver(initial = '') {
	let params = new URLSearchParams(initial)
	const commits: { search: string; history: UrlHistory }[] = []
	const driver: UrlDriver = {
		read: () => new URLSearchParams(params),
		commit: (next, history) => {
			params = new URLSearchParams(next)
			commits.push({ search: params.toString(), history })
		},
	}
	return {
		driver,
		commits,
		setExternal: (search: string) => {
			params = new URLSearchParams(search)
		},
		get search() {
			return params.toString()
		},
	}
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('@ez-kit/store-persist URL adapter', () => {
	it('preserves pending edits across delayed and intermediate router acknowledgements', () => {
		let rendered = new URLSearchParams('utm_source=mail&utm_source=campaign')
		const navigations: URLSearchParams[] = []
		const port = createUrlPort({
			read: () => rendered,
			commit: (params) => {
				navigations.push(new URLSearchParams(params))
			},
		})
		const patch = (name: string, value: string): void => {
			port.set(new Map([[name, value]]), { fields: [], diff: { set: [name], removed: [] }, meta: {} })
		}
		patch('q', 'boots')
		patch('page', '2')
		expect(navigations[1]?.get('q')).toBe('boots')
		expect(navigations[1]?.getAll('utm_source')).toEqual(['mail', 'campaign'])
		rendered = new URLSearchParams('q=boots&utm_source=mail&utm_source=campaign')
		expect(port.get().get('page')).toBe('2')
		patch('sort', 'asc')
		expect(navigations[2]?.get('page')).toBe('2')
		rendered = new URLSearchParams(navigations[2])
		expect(port.get().get('sort')).toBe('asc')
		// Back to the first acknowledged location must not resurrect newer pending values.
		rendered = new URLSearchParams(navigations[0])
		expect(port.get().has('page')).toBe(false)
	})

	it('explicit Back/Forward cancels pending intent even when its URL matches an old pending target', () => {
		let rendered = new URLSearchParams('q=initial&foreign=keep')
		let notify: (() => void) | undefined
		const port = createUrlPort({
			read: () => rendered,
			commit: () => undefined,
			subscribe: (listener) => {
				notify = listener
				return () => {
					notify = undefined
				}
			},
		})
		let observed: Keyed | undefined
		const unsubscribe = port.subscribe?.(() => {
			observed = port.get()
		})
		const context = { fields: [], diff: { set: ['q'], removed: [] }, meta: {} }
		port.set(new Map([['q', 'older']]), context)
		port.set(new Map([['q', 'newer']]), context)
		rendered = new URLSearchParams('q=older&foreign=keep')
		notify?.()
		expect(observed?.get('q')).toBe('older')
		port.set(new Map([['page', '2']]), { ...context, diff: { set: ['page'], removed: [] } })
		expect(port.get().get('q')).toBe('older')
		expect(port.get().get('foreign')).toBe('keep')
		// Navigation back to the exact still-rendered query also cancels queued intent.
		port.set(new Map([['q', 'pending']]), context)
		notify?.()
		expect(port.get().get('q')).toBe('older')
		unsubscribe?.()
		expect(notify).toBeUndefined()
	})

	it('external location changes preserve new foreign params and discard stale pending intent', () => {
		let rendered = new URLSearchParams('foreign=old')
		let next: URLSearchParams | undefined
		const port = createUrlPort({
			read: () => rendered,
			commit: (params) => {
				next = params
			},
		})
		port.set(new Map([['q', 'pending']]), { fields: [], diff: { set: ['q'], removed: [] }, meta: {} })
		rendered = new URLSearchParams('q=external&foreign=new')
		expect(port.get().get('q')).toBe('external')
		port.set(new Map([['page', '2']]), { fields: [], diff: { set: ['page'], removed: [] }, meta: {} })
		expect(next?.get('q')).toBe('external')
		expect(next?.get('foreign')).toBe('new')
	})

	it('rolls back optimistic intent when the router rejects a synchronous commit', () => {
		const port = createUrlPort({
			read: () => new URLSearchParams(),
			commit: () => {
				throw new Error('router unavailable')
			},
		})
		expect(() => {
			port.set(new Map([['q', 'failed']]), { fields: [], diff: { set: ['q'], removed: [] }, meta: {} })
		}).toThrow('router unavailable')
		expect(port.get().has('q')).toBe(false)
	})

	it('hydrates the proxy from the URL on connect', () => {
		const url = fakeDriver('?q=shoes')
		const engine = createPersistEngine(createUrlPort(url.driver), { mergeMeta: urlMetaMerge })
		const store = observable({ q: '' })

		engine.connect(createBinding(store, objectPort, [{ path: ['q'], parser: str }], {}))
		expect(store.q).toBe('shoes')
		engine.dispose()
	})

	it('writes a proxy change to the URL and preserves foreign params', async () => {
		const url = fakeDriver('?theme=dark')
		const engine = createPersistEngine(createUrlPort(url.driver), { mergeMeta: urlMetaMerge })
		const store = observable({ q: '' })
		engine.connect(createBinding(store, objectPort, [{ path: ['q'], parser: str }], {}))

		store.q = 'shoes'
		await tick()

		const result = new URLSearchParams(url.search)
		expect(result.get('q')).toBe('shoes')
		expect(result.get('theme')).toBe('dark')
		engine.dispose()
	})

	it('removes a key from the URL when it returns to default (clearOnDefault)', async () => {
		const url = fakeDriver('?q=shoes')
		const engine = createPersistEngine(createUrlPort(url.driver), { mergeMeta: urlMetaMerge })
		const store = observable({ q: '' })
		engine.connect(createBinding(store, objectPort, [{ path: ['q'], parser: str }], {}))

		store.q = ''
		await tick()

		expect(new URLSearchParams(url.search).has('q')).toBe(false)
		engine.dispose()
	})

	it('defaults to replace history and honors a push override', async () => {
		const url = fakeDriver()
		const engine = createPersistEngine(createUrlPort(url.driver), {
			mergeMeta: urlMetaMerge,
			defaultMeta: { history: UrlHistory.Replace },
		})
		const store = observable({ q: '' })
		engine.connect(createBinding(store, objectPort, [{ path: ['q'], parser: str }], {}))

		store.q = 'a'
		await tick()
		expect(url.commits.at(-1)?.history).toBe(UrlHistory.Replace)

		engine.runWithMeta({ history: UrlHistory.Push }, () => {
			store.q = 'b'
		})
		await tick()
		expect(url.commits.at(-1)?.history).toBe(UrlHistory.Push)
		engine.dispose()
	})

	it('applies a descriptor prefix to the substrate key (write and read)', async () => {
		const url = fakeDriver()
		const fields: FieldDescriptor[] = [{ path: ['q'], parser: str, prefix: 'cart.' }]
		const port = createUrlPort(url.driver)
		const engine = createPersistEngine(port, { mergeMeta: urlMetaMerge })
		const store = observable({ q: '' })
		engine.connect(createBinding(store, objectPort, fields, {}))

		store.q = 'shoes'
		await tick()
		expect(new URLSearchParams(url.search).get('cart.q')).toBe('shoes')

		url.setExternal('?cart.q=boots')
		engine.pull(port.get())
		await tick()
		expect(store.q).toBe('boots')
		engine.dispose()
	})

	it('pull from an external URL change updates the proxy without writing back', async () => {
		const url = fakeDriver('?id=1')
		const port = createUrlPort(url.driver)
		const engine = createPersistEngine(port, { mergeMeta: urlMetaMerge })
		const store = observable({ id: 1 })
		engine.connect(createBinding(store, objectPort, [{ path: ['id'], parser: num }], {}))

		url.setExternal('?id=9')
		engine.pull(port.get())
		await tick()

		expect(store.id).toBe(9)
		expect(url.commits).toHaveLength(0)
		engine.dispose()
	})

	describe('urlMetaMerge', () => {
		it('lets any push in a batch win over replace', () => {
			expect(urlMetaMerge({ history: UrlHistory.Push }, { history: UrlHistory.Replace })).toEqual({
				history: UrlHistory.Push,
			})
			expect(urlMetaMerge({ history: UrlHistory.Replace }, { history: UrlHistory.Push })).toEqual({
				history: UrlHistory.Push,
			})
		})

		it('falls back to replace when neither side specifies history', () => {
			expect(urlMetaMerge(null, {})).toEqual({ history: UrlHistory.Replace })
		})
	})
})
