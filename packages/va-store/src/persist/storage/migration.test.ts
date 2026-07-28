import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStoragePort } from './adapter'
import { readBlob, runMigration } from './blob'

import type { CommitCtx, Keyed } from '../types'

const ctx: CommitCtx = { fields: [], diff: { set: [], removed: [] }, meta: {} }
const keyed = (entries: [string, string][]): Keyed => new Map(entries)

/** Minimal in-memory Storage stand-in. */
class FakeStorage {
	private map = new Map<string, string>()
	getItem(key: string): string | null {
		return this.map.get(key) ?? null
	}
	setItem(key: string, value: string): void {
		this.map.set(key, value)
	}
	removeItem(key: string): void {
		this.map.delete(key)
	}
	raw(key: string): string | null {
		return this.map.get(key) ?? null
	}
}

describe('@ez-kit/va-store persist readBlob / runMigration', () => {
	it('reads a version and keyed values, treating a missing version as 0', () => {
		expect(readBlob(null)).toEqual({ version: 0, keyed: new Map() })
		expect(readBlob({ s: { q: 'x' } })).toEqual({ version: 0, keyed: keyed([['q', 'x']]) })
		expect(readBlob({ v: 3, s: { q: 'x' } })).toEqual({ version: 3, keyed: keyed([['q', 'x']]) })
	})

	it('runs the migration forward when the stored version is older', () => {
		const result = runMigration(
			{ v: 0, s: { q: 'shoes' } },
			{ version: 1, migrate: (stored, from) => keyed([['query', `${stored.get('q') ?? ''}@v${String(from)}`]]) },
		)
		expect(result).toEqual({ keyed: keyed([['query', 'shoes@v0']]), rewrite: true })
	})

	it('passes values through unchanged when the stored version is current or newer', () => {
		const result = runMigration({ v: 1, s: { q: 'x' } }, { version: 1, migrate: () => new Map() })
		expect(result).toEqual({ keyed: keyed([['q', 'x']]), rewrite: false })
	})

	it('falls back to empty defaults (but still rewrites) when the migration throws', () => {
		const result = runMigration(
			{ v: 0, s: { q: 'x' } },
			{
				version: 1,
				migrate: () => {
					throw new Error('boom')
				},
			},
		)
		expect(result).toEqual({ keyed: new Map(), rewrite: true })
	})
})

describe('@ez-kit/va-store persist storage migrations', () => {
	const KEY = 'store'
	let storage: FakeStorage

	beforeEach(() => {
		storage = new FakeStorage()
	})

	it('migrates old data forward and rewrites the store at the current version', () => {
		storage.setItem(KEY, JSON.stringify({ v: 0, s: { q: 'shoes' } }))
		const port = createStoragePort(() => storage as unknown as Storage, KEY, {
			version: 1,
			migrate: (stored) => keyed([['query', stored.get('q') ?? '']]),
		})

		expect(port.get()).toEqual(keyed([['query', 'shoes']]))
		expect(JSON.parse(storage.raw(KEY) ?? '')).toEqual({ v: 1, s: { query: 'shoes' } })
	})

	it('falls back to defaults and clears the store when the migration throws', () => {
		storage.setItem(KEY, JSON.stringify({ v: 0, s: { q: 'shoes' } }))
		const port = createStoragePort(() => storage as unknown as Storage, KEY, {
			version: 1,
			migrate: () => {
				throw new Error('bad migration')
			},
		})

		expect(port.get()).toEqual(new Map())
		expect(storage.raw(KEY)).toBeNull()
	})

	it('treats a blob without a version as v0 when migrating', () => {
		storage.setItem(KEY, JSON.stringify({ s: { q: 'shoes' } }))
		const migrate = vi.fn((stored: Keyed) => keyed([['query', stored.get('q') ?? '']]))
		const port = createStoragePort(() => storage as unknown as Storage, KEY, { version: 1, migrate })

		expect(port.get()).toEqual(keyed([['query', 'shoes']]))
		expect(migrate).toHaveBeenCalledWith(expect.any(Map), 0)
	})

	it('does not migrate or rewrite when the stored version is already current', () => {
		storage.setItem(KEY, JSON.stringify({ v: 2, s: { q: 'shoes' } }))
		const migrate = vi.fn(() => new Map<string, string>())
		const port = createStoragePort(() => storage as unknown as Storage, KEY, { version: 2, migrate })

		expect(port.get()).toEqual(keyed([['q', 'shoes']]))
		expect(migrate).not.toHaveBeenCalled()
		// Untouched: still the original v2 blob.
		expect(JSON.parse(storage.raw(KEY) ?? '')).toEqual({ v: 2, s: { q: 'shoes' } })
	})

	it('writes new data at the configured current version', () => {
		const port = createStoragePort(() => storage as unknown as Storage, KEY, { version: 5 })
		port.set(keyed([['q', 'shoes']]), ctx)
		expect(JSON.parse(storage.raw(KEY) ?? '')).toEqual({ v: 5, s: { q: 'shoes' } })
	})
})
