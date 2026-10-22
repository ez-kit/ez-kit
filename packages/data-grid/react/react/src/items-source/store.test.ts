import { afterEach, describe, expect, it, vi } from 'vitest'

import { optionsListOf } from './lists'
import { createItemsSourceStore, MAX_THROWN_RETRIES, PENDING_SNAPSHOT } from './store'
import { ItemsOwner, ItemsSourceSlot } from './types'

import type { ItemsMeta } from './lists'
import type { ListItem, ListSource } from './types'

const berlin: ListItem[] = [{ value: 'wh_12', label: 'Berlin' }]
const useAll: ListSource = () => ({ items: berlin })
const useActive: ListSource = () => ({ items: [] })

describe('createItemsSourceStore', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('reads a source as pending until its hook has answered', () => {
		const store = createItemsSourceStore()

		expect(store.getSnapshot(store.keyOf('warehouse', ItemsOwner.Base))).toBe(PENDING_SNAPSHOT)
	})

	it('keeps a source active while at least one reader holds it', () => {
		const store = createItemsSourceStore()
		const request = { columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll }

		const releaseA = store.acquire(request)
		const releaseB = store.acquire(request)
		expect(store.getActive()).toHaveLength(1)

		releaseA()
		expect(store.getActive()).toHaveLength(1)
		releaseB()
		expect(store.getActive()).toHaveLength(0)
	})

	it('does not count a release twice', () => {
		const store = createItemsSourceStore()
		const request = { columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll }
		const release = store.acquire(request)
		store.acquire(request)

		release()
		release()

		expect(store.getActive()).toHaveLength(1)
	})

	it('notifies the readers of a source only when its result changed', () => {
		const store = createItemsSourceStore()
		const key = store.keyOf('warehouse', ItemsOwner.Base)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		const version = store.versionOf(useAll)
		const listener = vi.fn()
		store.subscribe(key, listener)

		store.publish(key, version, { items: berlin, isLoading: false })
		store.publish(key, version, { items: berlin, isLoading: false, error: null })

		expect(listener).toHaveBeenCalledTimes(1)
		expect(store.getSnapshot(key)).toEqual({ items: berlin, isLoading: false, error: undefined })
	})

	it('does not notify readers for a new but equal list, as `data ?? []` makes while loading', () => {
		const store = createItemsSourceStore()
		const key = store.keyOf('warehouse', ItemsOwner.Base)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		const version = store.versionOf(useAll)
		const listener = vi.fn()
		store.subscribe(key, listener)

		store.publish(key, version, { items: [], isLoading: true })
		store.publish(key, version, { items: [], isLoading: true })

		expect(listener).not.toHaveBeenCalled()
	})

	it('tells the readers when a new hook takes over, so the old labels go at once', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const store = createItemsSourceStore()
		const key = store.keyOf('warehouse', ItemsOwner.Base)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		store.publish(key, store.versionOf(useAll), { items: berlin })
		const listener = vi.fn()
		store.subscribe(key, listener)

		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useActive })

		expect(listener).toHaveBeenCalledTimes(1)
		expect(store.getSnapshot(key)).toBe(PENDING_SNAPSHOT)
	})

	it('runs a hook that threw again, a bounded number of times', () => {
		vi.useFakeTimers()
		const store = createItemsSourceStore()
		const key = store.keyOf('warehouse', ItemsOwner.Base)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		const version = store.versionOf(useAll)

		for (let i = 0; i <= MAX_THROWN_RETRIES; i += 1) {
			store.fail(key, version, new Error('boom'))
			vi.runOnlyPendingTimers()
		}

		expect(store.getActive()[0]?.attempt).toBe(MAX_THROWN_RETRIES)
		expect(store.getSnapshot(key).error).toBeInstanceOf(Error)
		vi.useRealTimers()
	})

	it('runs a failed hook again when a new reader starts reading it', () => {
		const store = createItemsSourceStore()
		const key = store.keyOf('warehouse', ItemsOwner.Base)
		const request = { columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll }
		store.acquire(request)
		store.fail(key, store.versionOf(useAll), new Error('boom'))

		store.acquire(request)

		expect(store.getActive()[0]?.attempt).toBe(1)
	})

	it('does not notify the readers of another source', () => {
		const store = createItemsSourceStore()
		const warehouse = store.keyOf('warehouse', ItemsOwner.Base)
		const tags = store.keyOf('tags', ItemsOwner.Base)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		const listener = vi.fn()
		store.subscribe(tags, listener)

		store.publish(warehouse, store.versionOf(useAll), { items: berlin })

		expect(listener).not.toHaveBeenCalled()
	})

	it('keeps the active list identical while the set of sources is unchanged', () => {
		const store = createItemsSourceStore()
		const release = store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		const before = store.getActive()

		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })

		expect(store.getActive()).toBe(before)
		release()
	})

	it('ignores a result from the runner of a hook the source no longer uses', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const store = createItemsSourceStore()
		const key = store.keyOf('warehouse', ItemsOwner.Base)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		const stale = store.versionOf(useAll)
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useActive })

		store.publish(key, stale, { items: berlin })

		expect(store.getSnapshot(key)).toBe(PENDING_SNAPSHOT)
		expect(store.getActive()[0]?.version).toBe(store.versionOf(useActive))
	})

	it('warns once per source when its hook changes identity', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const store = createItemsSourceStore()

		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: useAll })
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: () => ({ items: [] }) })
		store.acquire({ columnId: 'warehouse', owner: ItemsOwner.Base, hook: () => ({ items: [] }) })

		expect(warn).toHaveBeenCalledTimes(1)
		expect(String(warn.mock.calls[0]?.[0])).toContain('"warehouse"')
	})
})

describe('optionsListOf — the inheritance chain', () => {
	const meta = (extra: Partial<ItemsMeta>): ItemsMeta => ({
		cell: { type: 'select', useItems: useAll },
		...extra,
	})

	it('lets a create field that states nothing share the editor’s source', () => {
		const resolved = optionsListOf(meta({ editing: { useItems: useActive } }), ItemsSourceSlot.Creating)

		expect(resolved).toEqual({ owner: ItemsOwner.Editing, useItems: useActive })
	})

	it('falls back from the create field to the base when neither override states a list', () => {
		expect(optionsListOf(meta({}), ItemsSourceSlot.Creating)).toEqual({ owner: ItemsOwner.Base, useItems: useAll })
	})

	it('skips an editor that is switched off', () => {
		expect(optionsListOf(meta({ editing: false }), ItemsSourceSlot.Creating)?.owner).toBe(ItemsOwner.Base)
	})

	it('lets the filter take its own list, else the base', () => {
		expect(optionsListOf(meta({ filtering: { useItems: useActive } }), ItemsSourceSlot.Filtering)?.owner).toBe(
			ItemsOwner.Filtering,
		)
		expect(optionsListOf(meta({}), ItemsSourceSlot.Filtering)?.owner).toBe(ItemsOwner.Base)
	})

	it('gives a non-list cell type no base', () => {
		expect(optionsListOf({ cell: { type: 'text', useItems: useAll } }, ItemsSourceSlot.Cell)).toBeUndefined()
	})
})
