import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { createIndexedDbPort } from './indexed-db'

import type { CommitCtx, Keyed } from '../types'

const ctx: CommitCtx = { fields: [], diff: { set: [], removed: [] }, meta: {} }
const keyed = (entries: [string, string][]): Keyed => new Map(entries)

/** A fresh, isolated IndexedDB-backed port (its own in-memory database). */
function freshPort(storageKey = 'state') {
	return createIndexedDbPort({ factory: new IDBFactory(), dbName: 'test-db', storeName: 'persist', storageKey })
}

describe('@ez-kit/valtio-kit persist createIndexedDbPort', () => {
	it('round-trips values through IndexedDB', async () => {
		const port = freshPort()
		await port.set(
			keyed([
				['q', 'shoes'],
				['page', '2'],
			]),
			ctx,
		)

		expect(await port.get()).toEqual(
			keyed([
				['q', 'shoes'],
				['page', '2'],
			]),
		)
	})

	it('returns an empty map before anything is written', async () => {
		expect(await freshPort().get()).toEqual(new Map())
	})

	it('removes the record when the desired map is empty', async () => {
		const port = freshPort()
		await port.set(keyed([['q', 'shoes']]), ctx)
		await port.set(new Map(), ctx)

		expect(await port.get()).toEqual(new Map())
	})

	it('serializes overlapping writes with the latest value winning', async () => {
		const port = freshPort()
		// Fire several writes without awaiting between them; the queue serializes and keeps the last.
		void port.set(keyed([['q', 'a']]), ctx)
		void port.set(keyed([['q', 'b']]), ctx)
		await port.set(keyed([['q', 'c']]), ctx)

		expect(await port.get()).toEqual(keyed([['q', 'c']]))
	})

	it('migrates older stored data forward on read and rewrites it', async () => {
		const factory = new IDBFactory()
		const common = { factory, dbName: 'mig-db', storeName: 'persist', storageKey: 'state' }

		// Seed a v0 blob.
		await createIndexedDbPort(common).set(keyed([['q', 'shoes']]), ctx)

		// Read through a v1 adapter that renames the key.
		const v1 = createIndexedDbPort({
			...common,
			version: 1,
			migrate: (stored) => keyed([['query', stored.get('q') ?? '']]),
		})
		expect(await v1.get()).toEqual(keyed([['query', 'shoes']]))
		// Rewritten at v1: a second read needs no migration and returns the same shape.
		expect(await v1.get()).toEqual(keyed([['query', 'shoes']]))
	})
})
