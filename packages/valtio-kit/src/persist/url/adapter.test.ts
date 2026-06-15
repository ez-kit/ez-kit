import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createBinding } from '../binding'
import { createPersistEngine } from '../engine'

import { createUrlPort, UrlHistory, urlMetaMerge, type UrlDriver } from './adapter'

import type { FieldDescriptor, Parser } from '../types'

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

describe('@ez-kit/valtio-kit persist URL adapter', () => {
	it('hydrates the proxy from the URL on connect', () => {
		const url = fakeDriver('?q=shoes')
		const fields: FieldDescriptor[] = [{ path: ['q'], parser: str }]
		const engine = createPersistEngine(
			createUrlPort(url.driver, () => fields),
			{ mergeMeta: urlMetaMerge },
		)
		const store = proxy({ q: '' })

		engine.connect(createBinding(store, fields, {}))
		expect(store.q).toBe('shoes')
		engine.dispose()
	})

	it('writes a proxy change to the URL and preserves foreign params', async () => {
		const url = fakeDriver('?theme=dark')
		const fields: FieldDescriptor[] = [{ path: ['q'], parser: str }]
		const engine = createPersistEngine(
			createUrlPort(url.driver, () => fields),
			{ mergeMeta: urlMetaMerge },
		)
		const store = proxy({ q: '' })
		engine.connect(createBinding(store, fields, {}))

		store.q = 'shoes'
		await tick()

		const result = new URLSearchParams(url.search)
		expect(result.get('q')).toBe('shoes')
		expect(result.get('theme')).toBe('dark')
		engine.dispose()
	})

	it('removes a key from the URL when it returns to default (clearOnDefault)', async () => {
		const url = fakeDriver('?q=shoes')
		const fields: FieldDescriptor[] = [{ path: ['q'], parser: str }]
		const engine = createPersistEngine(
			createUrlPort(url.driver, () => fields),
			{ mergeMeta: urlMetaMerge },
		)
		const store = proxy({ q: '' })
		engine.connect(createBinding(store, fields, {}))

		store.q = ''
		await tick()

		expect(new URLSearchParams(url.search).has('q')).toBe(false)
		engine.dispose()
	})

	it('defaults to replace history and honors a push override', async () => {
		const url = fakeDriver()
		const fields: FieldDescriptor[] = [{ path: ['q'], parser: str }]
		const engine = createPersistEngine(
			createUrlPort(url.driver, () => fields),
			{
				mergeMeta: urlMetaMerge,
				defaultMeta: { history: UrlHistory.Replace },
			},
		)
		const store = proxy({ q: '' })
		engine.connect(createBinding(store, fields, {}))

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

	it('applies a per-field prefix to the substrate key', async () => {
		const url = fakeDriver()
		const fields: FieldDescriptor[] = [{ path: ['q'], parser: str, meta: { prefix: 'cart.' } }]
		const engine = createPersistEngine(
			createUrlPort(url.driver, () => fields),
			{ mergeMeta: urlMetaMerge },
		)
		const store = proxy({ q: '' })
		engine.connect(createBinding(store, fields, {}))

		store.q = 'shoes'
		await tick()
		expect(new URLSearchParams(url.search).get('cart.q')).toBe('shoes')

		// And it reads back through the prefix.
		url.setExternal('?cart.q=boots')
		engine.pull(createUrlPort(url.driver, () => fields).get())
		await tick()
		expect(store.q).toBe('boots')
		engine.dispose()
	})

	it('pull from an external URL change updates the proxy without writing back', async () => {
		const url = fakeDriver('?id=1')
		const fields: FieldDescriptor[] = [{ path: ['id'], parser: num }]
		const port = createUrlPort(url.driver, () => fields)
		const engine = createPersistEngine(port, { mergeMeta: urlMetaMerge })
		const store = proxy({ id: 1 })
		engine.connect(createBinding(store, fields, {}))

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
