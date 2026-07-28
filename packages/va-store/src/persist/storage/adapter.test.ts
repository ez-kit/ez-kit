import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
const ctx: CommitCtx = { fields: [], diff: { set: [], removed: [] }, meta: {} }

function keyed(entries: [string, string][]): Keyed {
	return new Map(entries)
}

/** Parse a stored blob with a typed `s` record (avoids `any` member access in assertions). */
function blob(raw: string | null): { v?: number; s?: Record<string, string> } {
	return raw ? (JSON.parse(raw) as { v?: number; s?: Record<string, string> }) : {}
}

describe('@ez-kit/va-store persist createStoragePort', () => {
	let storage: FakeStorage

	beforeEach(() => {
		storage = new FakeStorage()
	})

	afterEach(() => {
		vi.restoreAllMocks()
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
		port.set(new Map(), ctx)

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

	it('warns once and does not throw when a write exceeds quota', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		storage.throwOnSet = true
		const port = createStoragePort(() => storage as unknown as Storage, KEY)

		expect(() => {
			port.set(keyed([['q', 'shoes']]), ctx)
		}).not.toThrow()
		expect(() => {
			port.set(keyed([['q', 'boots']]), ctx)
		}).not.toThrow()
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('treats a throwing storage area as disabled (no throw, empty read)', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const port = createStoragePort(() => {
			throw new Error('SecurityError: storage blocked')
		}, KEY)

		expect(port.get()).toEqual(new Map())
		expect(() => {
			port.set(keyed([['q', 'x']]), ctx)
		}).not.toThrow()
	})
})

describe('@ez-kit/va-store persist storage subscribe (cross-tab)', () => {
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
