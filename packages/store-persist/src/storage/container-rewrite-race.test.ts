import { IDBFactory } from 'fake-indexeddb'
import { it, expect } from 'vitest'

import { addressBinding, captureDefaults, createBinding } from '../binding'
import { paramNumber } from '../codecs'
import { createPersistEngine } from '../engine'
import { decodeRecord, encodeRecord } from '../record'
import { observable, objectPort } from '../test-kit'

import { createIndexedDbPort } from './indexed-db'
it.each(['invalidated', 'migrated'])(
	'does not resurrect %s A after overlapping full-container migrations',
	async (kind) => {
		const factory = new IDBFactory()
		const opts = { factory, dbName: 'rewrite-race-' + kind }
		const a = observable({ width: 320 })
		const b = observable({ height: 100 })
		const schema =
			kind === 'invalidated'
				? { version: 1, minVersion: 1 }
				: { version: 1, migrate: (value: unknown) => Number(value) + 10 }
		const ba = createBinding(a, objectPort, [{ path: ['width'], parser: paramNumber(), schema }], {})
		const bb = createBinding(b, objectPort, [{ path: ['height'], parser: paramNumber() }], {})
		captureDefaults(ba)
		captureDefaults(bb)
		addressBinding(ba, { path: [], name: 'a', id: '1' })
		addressBinding(bb, { path: [], name: 'b', id: '1' })
		const [ka] = ba.keyOf.values()
		const [kb] = bb.keyOf.values()
		if (ka === undefined || kb === undefined) throw new Error('Missing record addresses')
		const seed = createIndexedDbPort(opts)
		await seed.set(
			new Map([
				[ka, encodeRecord('900')],
				[kb, encodeRecord('200')],
			]),
			{ fields: [], diff: { set: [ka, kb], removed: [] }, meta: {} },
		)
		const port = createIndexedDbPort({ ...opts, version: 1, migrate: (values) => new Map(values) })
		const engine = createPersistEngine(port)
		const da = engine.connect(ba)
		const db = engine.connect(bb)
		try {
			await Promise.all([ba.restorePromise, bb.restorePromise])
			await engine.flush()
			const stored = await seed.get()
			expect(b.height).toBe(200)
			expect(ba.status.dirty).toBe(false)
			if (kind === 'invalidated') expect(stored.has(ka)).toBe(false)
			else {
				expect(a.width).toBe(910)
				const raw = stored.get(ka)
				if (raw === undefined) throw new Error('Missing migrated record')
				expect(decodeRecord(raw)).toEqual({ version: 1, value: '910' })
			}
		} finally {
			da()
			db()
			engine.dispose()
		}
	},
)
