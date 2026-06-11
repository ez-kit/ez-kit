import { proxy } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveFieldSpecs, withSearchParamsFields } from './accessor'
import { paramNumber, paramString } from './codecs'
import { clearRegistry } from './engine/registry'

describe('@ez-kit/valtio-kit accessor front', () => {
	beforeEach(() => {
		clearRegistry()
	})

	it('extracts a nested path from the selector', () => {
		const store = proxy({ filters: { price: { min: 0 } } })
		const [spec] = resolveFieldSpecs(store, (field) => [field((s) => s.filters.price.min, paramNumber())])
		expect(spec?.path).toEqual(['filters', 'price', 'min'])
	})

	it('auto-resolves a parser from the leaf value when omitted', () => {
		const store = proxy({ q: 'seed', page: 1 })
		const [q, page] = resolveFieldSpecs(store, (field) => [field((s) => s.q), field((s) => s.page)])
		expect(q?.parser.stringify('x')).toBe('x')
		expect(page?.parser.stringify(2)).toBe('2')
	})

	it('carries key/absolute options into descriptors', () => {
		const store = proxy({ filters: { q: '' } })
		const [desc] = resolveFieldSpecs(store, (field) => [
			field((s) => s.filters.q, paramString(), { key: 'query', absolute: true }),
		])
		expect(desc?.key).toBe('query')
		expect(desc?.absolute).toBe(true)
	})

	it('attaches a non-reactive $searchParams control and returns the same proxy', () => {
		const store = proxy({ q: '' })
		const bound = withSearchParamsFields(store, (field) => [field((s) => s.q, paramString())])
		expect(bound).toBe(store)
		expect(typeof bound.$searchParams.push).toBe('function')
		expect(typeof bound.$searchParams.replace).toBe('function')
	})

	it('rejects a parser that does not match the selected leaf (type)', () => {
		const store = proxy({ page: 1 })
		resolveFieldSpecs(store, (field) => [
			// @ts-expect-error parser type must follow the selected leaf (number, not string)
			field((s) => s.page, paramString()),
		])
		expect(true).toBe(true)
	})
})
