import { serializePersistAddress } from '@ez-kit/store-core'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'

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
	it('provisions multiple stores and preserves earlier ports during concurrent operations', async () => {
		const factory = new IDBFactory()
		const first = createIndexedDbPort({ factory, dbName: 'shared-stores', storeName: 'first' })
		const second = createIndexedDbPort({ factory, dbName: 'shared-stores', storeName: 'second' })
		await Promise.all([
			first.set(new Map([['q', 'first']]), ctx),
			second.set(new Map([['q', 'second']]), ctx),
			first.set(new Map([['page', '2']]), { ...ctx, diff: { set: ['page'], removed: [] } }),
		])
		expect(await first.get()).toEqual(
			new Map([
				['q', 'first'],
				['page', '2'],
			]),
		)
		expect(await second.get()).toEqual(new Map([['q', 'second']]))
	})

	it('closes on external upgrades and reopens using the current database version', async () => {
		const factory = new IDBFactory()
		const port = createIndexedDbPort({ factory, dbName: 'external-upgrade' })
		await port.set(new Map([['q', 'keep']]), ctx)
		const external = await new Promise<IDBDatabase>((resolve, reject) => {
			const open = factory.open('external-upgrade', 5)
			open.onupgradeneeded = () => {
				open.result.createObjectStore('external')
			}
			open.onsuccess = () => {
				resolve(open.result)
			}
			open.onerror = () => {
				reject(open.error ?? new Error('IndexedDB open failed'))
			}
		})
		external.close()
		expect(await port.get()).toEqual(new Map([['q', 'keep']]))
		const another = createIndexedDbPort({ factory, dbName: 'external-upgrade', storeName: 'new-store' })
		await another.set(new Map([['q', 'new']]), ctx)
		expect(await port.get()).toEqual(new Map([['q', 'keep']]))
		expect(await another.get()).toEqual(new Map([['q', 'new']]))
	})

	it('reports a blocked upgrade and permits retry once an external connection closes', async () => {
		const factory = new IDBFactory()
		const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
			const open = factory.open('blocked-upgrade', 1)
			open.onupgradeneeded = () => {
				open.result.createObjectStore('existing')
			}
			open.onsuccess = () => {
				resolve(open.result)
			}
			open.onerror = () => {
				reject(open.error ?? new Error('IndexedDB open failed'))
			}
		})
		const port = createIndexedDbPort({ factory, dbName: 'blocked-upgrade', storeName: 'new-store' })
		await expect(port.get()).rejects.toThrow('upgrade blocked')
		blocker.close()
		await port.set(new Map([['q', 'retry']]), ctx)
		expect(await port.get()).toEqual(new Map([['q', 'retry']]))
	})

	it('rejects unavailable browser IndexedDB instead of acknowledging nonexistent persistence', async () => {
		vi.stubGlobal('indexedDB', undefined)
		try {
			const port = createIndexedDbPort()
			await expect(port.get()).rejects.toThrow('IndexedDB is unavailable')
			await expect(port.set(new Map([['q', 'lost']]), ctx)).rejects.toThrow('IndexedDB is unavailable')
			await expect(port.removeScope?.([])).rejects.toThrow('IndexedDB is unavailable')
		} finally {
			vi.unstubAllGlobals()
		}
	})

	it('never interprets public metadata as a container rewrite or version-guard exemption', async () => {
		const port = freshPort()
		const future = encodeRecord('900', 9)
		await port.set(
			new Map([
				['q', future],
				['foreign', 'keep'],
			]),
			{ ...ctx, diff: { set: ['q', 'foreign'], removed: [] } },
		)
		await expect(
			port.set(new Map([['q', encodeRecord('500')]]), {
				...ctx,
				meta: { containerRewrite: true },
				diff: { set: ['q'], removed: [] },
				maxVersions: new Map([['q', 0]]),
			}),
		).rejects.toBeInstanceOf(FutureVersionError)
		await port.set(new Map([['page', '2']]), {
			...ctx,
			meta: { containerRewrite: true },
			diff: { set: ['page'], removed: [] },
		})
		expect(await port.get()).toEqual(
			new Map([
				['q', future],
				['foreign', 'keep'],
				['page', '2'],
			]),
		)
		await port.rewriteContainer?.(new Map([['migrated', 'value']]))
		expect(await port.get()).toEqual(new Map([['migrated', 'value']]))
	})

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
