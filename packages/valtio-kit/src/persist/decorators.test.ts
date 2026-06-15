import { describe, expect, it } from 'vitest'

import { paramNumber } from './codecs'
import { discoverPersistFields, persistField } from './decorators'
import { UrlHistory } from './url/adapter'
import { persistUrl } from './url/decorator'

const LOCAL = 'localStorage'

describe('@ez-kit/valtio-kit persist decorators', () => {
	it('discovers a persistUrl field with its path, source, and packed meta', () => {
		class Store {
			@persistUrl({ history: UrlHistory.Push, prefix: 'cart.' }) q = ''
		}
		const specs = discoverPersistFields(new Store())

		expect(specs).toHaveLength(1)
		expect(specs[0]?.source).toBe('url')
		expect(specs[0]?.descriptor.path).toEqual(['q'])
		expect(specs[0]?.descriptor.meta).toEqual({ history: UrlHistory.Push, prefix: 'cart.' })
	})

	it('auto-resolves a parser from the runtime value', () => {
		class Store {
			@persistUrl() page = 1
		}
		const specs = discoverPersistFields(new Store())
		// number value → numeric round-trip
		expect(specs[0]?.descriptor.parser.parse('5')).toBe(5)
	})

	it('honors an explicit parser and key override', () => {
		class Store {
			@persistUrl({ key: 'p', parser: paramNumber() }) page = 1
		}
		const specs = discoverPersistFields(new Store())
		expect(specs[0]?.descriptor.key).toBe('p')
		expect(specs[0]?.descriptor.parser.parse('9')).toBe(9)
	})

	it('emits one spec per (field, source) when a field targets multiple sources', () => {
		class Store {
			@persistUrl()
			@persistField({ source: LOCAL })
			q = ''
		}
		const specs = discoverPersistFields(new Store())
		const sources = specs
			.filter((s) => s.descriptor.path[0] === 'q')
			.map((s) => s.source)
			.sort()

		expect(sources).toEqual(['localStorage', 'url'])
	})

	it('recurses into composed decorated objects', () => {
		class Filters {
			@persistUrl() q = ''
		}
		class Store {
			filters = new Filters()
		}
		const specs = discoverPersistFields(new Store())
		expect(specs[0]?.descriptor.path).toEqual(['filters', 'q'])
	})

	it('lets a subclass override a field for the same source', () => {
		class Base {
			@persistUrl({ key: 'base' }) q = ''
		}
		class Child extends Base {
			@persistUrl({ key: 'child' }) q = ''
		}
		const specs = discoverPersistFields(new Child())
		const urlForQ = specs.filter((s) => s.source === 'url' && s.descriptor.path[0] === 'q')
		expect(urlForQ).toHaveLength(1)
		expect(urlForQ[0]?.descriptor.key).toBe('child')
	})
})
