import { serializePersistAddress } from '@ez-kit/store-core'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { encodeRecord, FutureVersionError } from '../record'

import { createIndexedDbPort } from './indexed-db'

import type { CommitCtx, Keyed } from '../types'

const ctx: CommitCtx = { fields: [], diff: { set: ['q', 'page'], removed: [] }, meta: {} }
const keyed = (entries: [string, string][]): Keyed => new Map(entries)

/** A fresh, isolated IndexedDB-backed port (its own in-memory database). */
function freshPort(storageKey = 'state') {
	return createIndexedDbPort({ factory: new IDBFactory(), dbName: 'test-db', storeName: 'persist', storageKey })
}

describe('@ez-kit/store-persist createIndexedDbPort', () => {
	it('atomically patches independent records, guards future versions and deletes full scopes', async () => {
		const port = freshPort()
		const key = (path: string[], id: string) =>
			serializePersistAddress({ store: { path, name: 'panel', id }, field: ['width'] })
		const active = key(['devices'], 'active')
		const closed = key(['devices'], 'never-mounted')
		const sibling = key(['devices-other'], 'active')
		const values = new Map([
			[active, encodeRecord('900', 9)],
			[closed, encodeRecord('400')],
			[sibling, encodeRecord('500')],
			['legacy', 'keep'],
		])
		await port.set(values, { ...ctx, diff: { set: [...values.keys()], removed: [] } })
		await expect(
			port.set(new Map([[active, encodeRecord('320')]]), {
				...ctx,
				diff: { set: [active], removed: [] },
				maxVersions: new Map([[active, 0]]),
			}),
		).rejects.toBeInstanceOf(FutureVersionError)
		expect((await port.get()).get(active)).toBe(encodeRecord('900', 9))
		await port.set(new Map(), {
			...ctx,
			diff: { set: [], removed: [active] },
			maxVersions: new Map([[active, 0]]),
			explicitReset: true,
		})
		await port.removeScope?.(['devices'])
		expect(await port.get()).toEqual(
			new Map([
				[sibling, encodeRecord('500')],
				['legacy', 'keep'],
			]),
		)
	})
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
		await port.set(new Map(), { ...ctx, diff: { set: [], removed: ['q', 'page'] } })

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
