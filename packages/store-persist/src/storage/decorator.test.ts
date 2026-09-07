import { describe, expect, it } from 'vitest'

import { paramNumber } from '../codecs'
import { discoverPersistFields } from '../decorators'

import { LOCAL_STORAGE_SOURCE, SESSION_STORAGE_SOURCE } from './adapter'
import {
	indexedDbField,
	localStorageField,
	persistIndexedDb,
	persistLocalStorage,
	persistSessionStorage,
	sessionStorageField,
} from './decorator'
import { INDEXED_DB_SOURCE } from './indexed-db'

describe('@ez-kit/store-persist storage decorators', () => {
	it('marks a field for localStorage with the property name as its key', () => {
		class Store {
			@persistLocalStorage() pageSize = 25
		}

		const specs = discoverPersistFields(new Store())

		expect(specs).toHaveLength(1)
		expect(specs[0]?.source).toBe(LOCAL_STORAGE_SOURCE)
		expect(specs[0]?.descriptor.path).toEqual(['pageSize'])
		expect(specs[0]?.descriptor.key).toBeUndefined()
		// No `storageKey` given, so nothing is packed for the adapter.
		expect(specs[0]?.descriptor.meta).toEqual({})
	})

	it('routes sessionStorage and IndexedDB to their own sources', () => {
		class Store {
			@persistSessionStorage() draft = ''
			@persistIndexedDb() blob = ''
		}

		const specs = discoverPersistFields(new Store())
		const bySource = new Map(specs.map((spec) => [spec.source, spec]))

		expect(bySource.get(SESSION_STORAGE_SOURCE)?.descriptor.path).toEqual(['draft'])
		expect(bySource.get(INDEXED_DB_SOURCE)?.descriptor.path).toEqual(['blob'])
	})

	it('packs storageKey into meta and keeps key/absolute on the descriptor', () => {
		class Store {
			@persistLocalStorage({ key: 'size', absolute: true, storageKey: 'cart' }) pageSize = 25
		}

		const specs = discoverPersistFields(new Store())

		expect(specs[0]?.descriptor.key).toBe('size')
		expect(specs[0]?.descriptor.absolute).toBe(true)
		expect(specs[0]?.descriptor.meta).toEqual({ storageKey: 'cart' })
	})

	it('honours an explicit parser instead of auto-resolving one', () => {
		class Store {
			@persistLocalStorage({ parser: paramNumber() }) pageSize = 25
		}

		const specs = discoverPersistFields(new Store())

		expect(specs[0]?.descriptor.parser.parse('9')).toBe(9)
	})

	it('lets one property sync to two storage sources at once', () => {
		class Store {
			@persistLocalStorage()
			@persistSessionStorage()
			theme = 'dark'
		}

		const specs = discoverPersistFields(new Store())

		expect(specs.map((spec) => spec.source).sort()).toEqual([LOCAL_STORAGE_SOURCE, SESSION_STORAGE_SOURCE].sort())
		expect(specs.every((spec) => spec.descriptor.path.join('.') === 'theme')).toBe(true)
	})

	it('builds accessor options that mirror the decorators', () => {
		expect(localStorageField()).toEqual({ source: LOCAL_STORAGE_SOURCE, meta: {} })
		expect(sessionStorageField({ storageKey: 'cart' })).toEqual({
			source: SESSION_STORAGE_SOURCE,
			meta: { storageKey: 'cart' },
		})

		const parser = paramNumber()
		expect(indexedDbField({ key: 'p', absolute: true, parser })).toEqual({
			source: INDEXED_DB_SOURCE,
			meta: {},
			key: 'p',
			absolute: true,
			parser,
		})
	})
})
