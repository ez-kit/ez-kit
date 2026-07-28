import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { resolveFieldSpecs } from './accessor'
import { paramNumber, paramString } from './codecs'
import { urlField } from './url/decorator'

describe('@ez-kit/va-store persist accessor', () => {
	it('derives a nested path from a selector and tags the source', () => {
		const store = proxy({ filters: { q: '' } })
		const specs = resolveFieldSpecs(store, (field) => [
			field((s) => s.filters.q, { source: 'url', parser: paramString() }),
		])

		expect(specs[0]?.source).toBe('url')
		expect(specs[0]?.descriptor.path).toEqual(['filters', 'q'])
	})

	it('auto-resolves a missing parser from the store value', () => {
		const store = proxy({ page: 1 })
		const specs = resolveFieldSpecs(store, (field) => [field((s) => s.page, { source: 'url' })])
		expect(specs[0]?.descriptor.parser.parse('7')).toBe(7)
	})

	it('carries explicit parser, key, and meta', () => {
		const store = proxy({ page: 1 })
		const specs = resolveFieldSpecs(store, (field) => [
			field((s) => s.page, { source: 'url', parser: paramNumber(), key: 'p', meta: { prefix: 'x.' } }),
		])
		expect(specs[0]?.descriptor.key).toBe('p')
		expect(specs[0]?.descriptor.meta).toEqual({ prefix: 'x.' })
	})

	it('parity with the url field helper', () => {
		const store = proxy({ q: '' })
		const specs = resolveFieldSpecs(store, (field) => [field((s) => s.q, urlField({ parser: paramString() }))])
		expect(specs[0]?.source).toBe('url')
		expect(specs[0]?.descriptor.path).toEqual(['q'])
	})
})
