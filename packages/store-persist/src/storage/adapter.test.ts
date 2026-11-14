import { serializePersistAddress } from '@ez-kit/store-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { encodeRecord, FutureVersionError } from '../record'

import { createStoragePort } from './adapter'

import type { CommitCtx, Keyed } from '../types'

/** Minimal in-memory Storage stand-in with hooks to simulate quota/disabled failures. */
class FakeStorage {
	private map = new Map<string, string>()
	throwOnSet = false
	throwOnGet = false

	getItem(key: string): string | null {
		if (this.throwOnGet) {
			throw new Error('storage disabled')
		}
		return this.map.get(key) ?? null
	}

	setItem(key: string, value: string): void {
		if (this.throwOnSet) {
			throw new DOMException('quota exceeded', 'QuotaExceededError')
		}
		this.map.set(key, value)
	}

	removeItem(key: string): void {
		this.map.delete(key)
	}

	raw(key: string): string | null {
		return this.map.get(key) ?? null
	}
}

const KEY = 'store'
const ctx: CommitCtx = { fields: [], diff: { set: ['q', 'page'], removed: [] }, meta: {} }

function keyed(entries: [string, string][]): Keyed {
	return new Map(entries)
}

/** Parse a stored blob with a typed `s` record (avoids `any` member access in assertions). */
function blob(raw: string | null): { v?: number; s?: Record<string, string> } {
	return raw ? (JSON.parse(raw) as { v?: number; s?: Record<string, string> }) : {}
}

describe('@ez-kit/store-persist createStoragePort', () => {
	it('keeps the old namespace intact during a new-key rollout and scope reset', () => {
		const storage = new FakeStorage()
		storage.setItem('old-layouts', JSON.stringify({ v: 0, s: { width: '700' } }))
		const old = storage.raw('old-layouts')
		const port = createStoragePort(() => storage as unknown as Storage, 'new-layouts')
		const key = serializePersistAddress({
			store: { path: ['devices'], name: 'panel', id: 'workspace' },
			field: ['width'],
		})
		expect(port.get()).toEqual(new Map())
		port.set(
			new Map([
				[key, encodeRecord('500')],
				['legacy', 'keep'],
			]),
			{ fields: [], meta: {}, diff: { set: [key, 'legacy'], removed: [] } },
		)
		port.removeScope?.(['devices'])
		expect(port.get()).toEqual(new Map([['legacy', 'keep']]))
		expect(storage.raw('old-layouts')).toBe(old)
		expect(createStoragePort(() => storage as unknown as Storage, 'old-layouts').get()).toEqual(
			new Map([['width', '700']]),
		)
	})
	let storage: FakeStorage

	beforeEach(() => {
		storage = new FakeStorage()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('treats mutation metadata as opaque and keeps patch/version guards enabled', () => {
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		const future = encodeRecord('900', 9)
		storage.setItem(KEY, JSON.stringify({ v: 0, s: { foreign: 'keep', q: future } }))
		const guarded = {
			...ctx,
			meta: { containerRewrite: true },
			diff: { set: ['q'], removed: [] },
			maxVersions: new Map([['q', 0]]),
		}
		expect(() => {
			port.set(new Map([['q', encodeRecord('500')]]), guarded)
		}).toThrow(FutureVersionError)
		port.set(new Map([['page', '2']]), {
			...ctx,
			meta: { containerRewrite: true },
			diff: { set: ['page'], removed: [] },
		})
		expect(port.get()).toEqual(
			new Map([
				['foreign', 'keep'],
				['q', future],
				['page', '2'],
			]),
		)
	})

	it('exposes an explicit container rewrite operation independently of user metadata', () => {
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		port.set(new Map([['q', 'old']]), ctx)
		port.rewriteContainer?.(new Map([['renamed', 'current']]))
		expect(port.get()).toEqual(new Map([['renamed', 'current']]))
	})

	it('round-trips values as a single { v, s } blob', () => {
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		port.set(
			keyed([
				['q', 'shoes'],
				['page', '2'],
			]),
			ctx,
		)

		expect(blob(storage.raw(KEY))).toEqual({ v: 0, s: { q: 'shoes', page: '2' } })
		expect(port.get()).toEqual(
			keyed([
				['q', 'shoes'],
				['page', '2'],
			]),
		)
	})

	it('writes only the keys present in the desired map (clearOnDefault omission happens upstream)', () => {
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		port.set(keyed([['q', 'shoes']]), ctx)

		expect(blob(storage.raw(KEY)).s).toEqual({ q: 'shoes' })
		expect(blob(storage.raw(KEY)).s?.page).toBeUndefined()
	})

	it('removes the key when the desired map is empty', () => {
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		port.set(keyed([['q', 'shoes']]), ctx)
		port.set(new Map(), { ...ctx, diff: { set: [], removed: ['q', 'page'] } })

		expect(storage.raw(KEY)).toBeNull()
		expect(port.get()).toEqual(new Map())
	})

	it('is inert on the server (no storage area)', () => {
		const port = createStoragePort(() => null, KEY)
		expect(port.get()).toEqual(new Map())
		expect(() => {
			port.set(keyed([['q', 'shoes']]), ctx)
		}).not.toThrow()
	})

	it('falls back to defaults and clears the key on a corrupt blob', () => {
		storage.setItem(KEY, 'not-json{')
		const port = createStoragePort(() => storage as unknown as Storage, KEY)

		expect(port.get()).toEqual(new Map())
		expect(storage.raw(KEY)).toBeNull()
	})

	it('treats a blob without a valid `s` record as empty', () => {
		storage.setItem(KEY, JSON.stringify({ v: 0 }))
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		expect(port.get()).toEqual(new Map())
	})

	it('exposes quota failures to the engine reporter', () => {
		storage.throwOnSet = true
		const port = createStoragePort(() => storage as unknown as Storage, KEY)
		expect(() => {
			port.set(keyed([['q', 'shoes']]), ctx)
		}).toThrow('quota exceeded')
	})

	it('exposes blocked-area failures instead of treating them as missing data', () => {
		const port = createStoragePort(() => {
			throw new Error('SecurityError: storage blocked')
		}, KEY)
		expect(() => port.get()).toThrow('SecurityError')
		expect(() => {
			port.set(keyed([['q', 'x']]), ctx)
		}).toThrow('SecurityError')
	})
})

describe('@ez-kit/store-persist storage subscribe (cross-tab)', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	function fireStorage(init: StorageEventInit): void {
		window.dispatchEvent(new StorageEvent('storage', init))
	}

	it('notifies on a cross-tab change to its own key', () => {
		const port = createStoragePort(() => window.localStorage, KEY)
		const onChange = vi.fn()
		const unsubscribe = port.subscribe?.(onChange)

		fireStorage({ key: KEY, storageArea: window.localStorage, newValue: '{"v":0,"s":{"q":"x"}}' })
		expect(onChange).toHaveBeenCalledTimes(1)

		unsubscribe?.()
	})

	it('notifies on a full clear (null key)', () => {
		const port = createStoragePort(() => window.localStorage, KEY)
		const onChange = vi.fn()
		const unsubscribe = port.subscribe?.(onChange)

		fireStorage({ key: null, storageArea: window.localStorage })
		expect(onChange).toHaveBeenCalledTimes(1)

		unsubscribe?.()
	})

	it('ignores changes to a different key or a different storage area', () => {
		const port = createStoragePort(() => window.localStorage, KEY)
		const onChange = vi.fn()
		const unsubscribe = port.subscribe?.(onChange)

		fireStorage({ key: 'other-store', storageArea: window.localStorage, newValue: '{}' })
		fireStorage({ key: KEY, storageArea: window.sessionStorage, newValue: '{}' })
		expect(onChange).not.toHaveBeenCalled()

		unsubscribe?.()
	})

	it('stops notifying after unsubscribe', () => {
		const port = createStoragePort(() => window.localStorage, KEY)
		const onChange = vi.fn()
		const unsubscribe = port.subscribe?.(onChange)

		unsubscribe?.()
		fireStorage({ key: KEY, storageArea: window.localStorage, newValue: '{}' })
		expect(onChange).not.toHaveBeenCalled()
	})
})
