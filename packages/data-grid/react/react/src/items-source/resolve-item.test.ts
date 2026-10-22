import { ItemStatus } from '@ez-kit/data-grid-core'
import { describe, expect, it, vi } from 'vitest'

import { staticSnapshot } from './lists'
import { resolveItem } from './resolve-item'

import type { ListItem, ListSnapshot } from './types'

type Order = { warehouse: { id: string; name: string } }

const row: Order = { warehouse: { id: 'wh_12', name: 'Berlin' } }
const getItem = (r: unknown): ListItem => {
	const { warehouse } = r as Order
	return { value: warehouse.id, label: warehouse.name }
}
const loading: ListSnapshot = { items: [], isLoading: true, error: undefined }
const failed: ListSnapshot = { items: [], isLoading: false, error: new Error('503') }

describe('resolveItem', () => {
	it('labels from the row while the list is still loading', () => {
		expect(resolveItem('wh_12', { labels: loading, row, getItem })).toEqual({
			status: ItemStatus.Resolved,
			item: { value: 'wh_12', label: 'Berlin' },
		})
	})

	it('prefers the list over the row', () => {
		const hq = { value: 'wh_12', label: 'Berlin HQ', icon: 'building' }
		const labels = staticSnapshot([hq])

		expect(resolveItem('wh_12', { labels, row, getItem })).toEqual({ status: ItemStatus.Resolved, item: hq })
	})

	it('labels from getItem alone, with no list at all', () => {
		const bern = { warehouse: { id: 'wh_7', name: 'Bern' } }

		expect(resolveItem('wh_7', { row: bern, getItem }).item?.label).toBe('Bern')
	})

	it('is pending while the list loads and nothing else labels the value', () => {
		expect(resolveItem('wh_12', { labels: loading })).toEqual({ status: ItemStatus.Pending })
	})

	it('reports the hook’s failure when nothing labels the value', () => {
		expect(resolveItem('wh_12', { labels: failed })).toEqual({ status: ItemStatus.Error })
	})

	it('is missing when the loaded list does not hold the value', () => {
		const labels = staticSnapshot([{ value: 'wh_12', label: 'Berlin' }])

		expect(resolveItem('wh_99', { labels })).toEqual({ status: ItemStatus.Missing })
	})

	it('falls back to the faceted index for a value the list does not label', () => {
		const facetedIndex = new Map([['wh_12', { value: 'wh_12', label: 'Berlin' }]])

		expect(resolveItem('wh_12', { labels: loading, facetedIndex }).item?.label).toBe('Berlin')
	})

	it('does not label a value with the row’s item for another value', () => {
		expect(resolveItem('wh_99', { labels: loading, row, getItem })).toEqual({ status: ItemStatus.Pending })
	})

	it('treats a getItem that throws as no label', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const throwing = (): ListItem => {
			throw new TypeError('warehouse is null')
		}

		expect(resolveItem('wh_12', { row, getItem: throwing })).toEqual({ status: ItemStatus.Missing })
	})

	it('labels a value the list repeats by its first item', () => {
		const labels = staticSnapshot([
			{ value: 'wh_12', label: 'Berlin' },
			{ value: 'wh_12', label: 'Berlin (duplicate)' },
		])

		expect(resolveItem('wh_12', { labels }).item?.label).toBe('Berlin')
	})

	it('does not read an empty value as loading', () => {
		expect(resolveItem(undefined, { labels: loading })).toEqual({ status: ItemStatus.Missing })
		expect(resolveItem('', { labels: loading })).toEqual({ status: ItemStatus.Missing })
	})
})
