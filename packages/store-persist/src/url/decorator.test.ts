import { describe, expect, it } from 'vitest'

import { paramNumber } from '../codecs'
import { discoverPersistFields } from '../decorators'

import { URL_SOURCE, UrlHistory } from './adapter'
import { persistUrl, urlField } from './decorator'

describe('@ez-kit/store-persist URL decorator', () => {
	it('defaults to the URL source with empty meta and no key overrides', () => {
		class Store {
			@persistUrl() q = ''
		}

		const specs = discoverPersistFields(new Store())

		expect(specs[0]?.source).toBe(URL_SOURCE)
		expect(specs[0]?.descriptor.meta).toEqual({})
		expect(specs[0]?.descriptor.key).toBeUndefined()
		expect(specs[0]?.descriptor.absolute).toBeUndefined()
		expect(specs[0]?.descriptor.prefix).toBeUndefined()
	})

	it('puts key naming on the descriptor and history in meta', () => {
		const parser = paramNumber()

		class Store {
			@persistUrl({ key: 'p', absolute: true, prefix: 'cart.', history: UrlHistory.Push, parser }) page = 1
		}

		const specs = discoverPersistFields(new Store())

		expect(specs[0]?.descriptor).toMatchObject({
			key: 'p',
			absolute: true,
			prefix: 'cart.',
			meta: { history: UrlHistory.Push },
			parser,
		})
	})

	it('builds accessor options with the same split — and omits what was not given', () => {
		expect(urlField()).toEqual({ source: URL_SOURCE, meta: {} })

		const parser = paramNumber()
		expect(urlField({ key: 'p', absolute: true, prefix: 'cart.', history: UrlHistory.Replace, parser })).toEqual({
			source: URL_SOURCE,
			meta: { history: UrlHistory.Replace },
			key: 'p',
			absolute: true,
			prefix: 'cart.',
			parser,
		})
	})
})
