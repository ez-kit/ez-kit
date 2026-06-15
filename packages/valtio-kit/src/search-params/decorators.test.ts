import { proxy } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { paramNumber, paramString } from './codecs'
import { discoverDecoratedFields, searchParam, withSearchParams } from './decorators'
import { clearRegistry } from './engine/registry'

import type { FieldDescriptor } from './types'

function byPath(fields: FieldDescriptor[]): Record<string, FieldDescriptor> {
	const out: Record<string, FieldDescriptor> = {}
	for (const field of fields) {
		out[field.path.join('.')] = field
	}
	return out
}

describe('@ez-kit/valtio-kit decorator front', () => {
	beforeEach(() => {
		clearRegistry()
	})

	it('discovers decorated leaf fields with the property name as the key', () => {
		class Store {
			@searchParam() q = ''
			@searchParam() page = 1
		}
		const fields = discoverDecoratedFields(proxy(new Store()))
		expect(Object.keys(byPath(fields)).sort()).toEqual(['page', 'q'])
	})

	it('auto-recurses composed instances, nesting their paths', () => {
		class Price {
			@searchParam() min = 0
			@searchParam() max = 100
		}
		class Filters {
			@searchParam() q = ''
			price = new Price()
		}
		class AppStore {
			filters = new Filters()
		}
		const fields = byPath(discoverDecoratedFields(proxy(new AppStore())))
		expect(Object.keys(fields).sort()).toEqual(['filters.price.max', 'filters.price.min', 'filters.q'])
	})

	it('includes inherited decorated fields', () => {
		class Base {
			@searchParam() q = ''
		}
		class Special extends Base {
			@searchParam() extra = ''
		}
		const fields = byPath(discoverDecoratedFields(proxy(new Special())))
		expect(Object.keys(fields).sort()).toEqual(['extra', 'q'])
	})

	it('terminates on cyclic composition', () => {
		class Node {
			@searchParam() label = ''
			next: Node | null = null
		}
		const a = new Node()
		const b = new Node()
		a.next = b
		b.next = a
		const store = proxy(a)
		expect(() => discoverDecoratedFields(store)).not.toThrow()
	})

	it('honours key and absolute options', () => {
		class Search {
			@searchParam({ key: 'q', absolute: true }) query = ''
		}
		class Filters {
			search = new Search()
		}
		const [desc] = discoverDecoratedFields(proxy(new Filters()))
		expect(desc?.path).toEqual(['search', 'query'])
		expect(desc?.key).toBe('q')
		expect(desc?.absolute).toBe(true)
	})

	it('auto-resolves parsers and respects an explicit one', () => {
		class Store {
			@searchParam() page = 1
			@searchParam({ parser: paramString() }) q = ''
		}
		const fields = byPath(discoverDecoratedFields(proxy(new Store())))
		expect(fields.page?.parser.stringify(2)).toBe('2')
		expect(fields.q?.parser.stringify('x')).toBe('x')
	})

	it('attaches $searchParams via withSearchParams and returns the same proxy', () => {
		class Store {
			@searchParam() q = ''
		}
		const store = proxy(new Store())
		const bound = withSearchParams(store)
		expect(bound).toBe(store)
		expect(typeof bound.$searchParams.push).toBe('function')
	})

	it('rejects an explicit parser that does not match the field type (type)', () => {
		class Bad {
			// @ts-expect-error parser type must match the field type (string, not number)
			@searchParam({ parser: paramNumber() }) q = ''
		}
		expect(discoverDecoratedFields(proxy(new Bad()))).toHaveLength(1)
	})
})
