import { describe, expectTypeOf, it } from 'vitest'

import { createColumnHelper } from '../create-column-helper'

import { createColumns } from './create-columns'

import type { BadgeItem, SelectCellConfig, SelectItem } from '../types'

type Order = { id: string; warehouse: { id: string; name: string }; status: string }

const warehouses: SelectItem[] = [{ value: 'wh_12', label: 'Berlin' }]
const useWarehouses = () => ({ items: warehouses, isLoading: false })

describe('select / badge config — items or useItems', () => {
	it('accepts a fixed list, a hook, or both', () => {
		createColumns<Order>([
			{ accessorKey: 'status', cell: { type: 'select', config: { items: warehouses } } },
			{ accessorKey: 'status', cell: { type: 'select', config: { useItems: useWarehouses } } },
			{ accessorKey: 'status', cell: { type: 'select', config: { items: warehouses, useItems: useWarehouses } } },
		])
	})

	it('rejects a config that states no list at all', () => {
		createColumns<Order>([
			// @ts-expect-error a select column has to say where its values come from
			{ accessorKey: 'status', cell: { type: 'select', config: {} } },
		])
		createColumns<Order>([
			// @ts-expect-error `getItem` alone labels a row, but there is still no list to offer
			{ accessorKey: 'status', cell: { type: 'badge', config: { getItem: () => undefined } } },
		])
	})

	it('types a badge hook by BadgeItem', () => {
		const useBadges = () => ({ items: [{ value: 'open', label: 'Open', variant: 'secondary' as const }] })
		createColumns<Order>([{ accessorKey: 'status', cell: { type: 'badge', config: { useItems: useBadges } } }])

		const useBogusBadges = () => ({ items: [{ value: 'open', label: 'Open', variant: 'bogus' as const }] })
		createColumns<Order>([
			// @ts-expect-error `bogus` is not a badge variant
			{ accessorKey: 'status', cell: { type: 'badge', config: { useItems: useBogusBadges } } },
		])
	})

	it('hands getItem the column’s own row type', () => {
		createColumns<Order>([
			{
				id: 'warehouse',
				accessorFn: (row) => row.warehouse.id,
				cell: {
					type: 'select',
					config: {
						useItems: useWarehouses,
						getItem: (row) => {
							expectTypeOf(row).toEqualTypeOf<Order>()
							return { value: row.warehouse.id, label: row.warehouse.name }
						},
					},
				},
			},
		])
	})

	it('rebinds getItem on the column helper too', () => {
		const column = createColumnHelper<Order>()
		column.badge({
			accessorKey: 'status',
			config: {
				items: [] as BadgeItem[],
				getItem: (row) => {
					expectTypeOf(row).toEqualTypeOf<Order>()
					return undefined
				},
			},
		})
	})

	it('accepts a readonly list, as a query result or an `as const` array comes', () => {
		const frozen: readonly SelectItem[] = warehouses
		const useFrozen = () => ({ items: frozen })
		createColumns<Order>([
			{ accessorKey: 'status', cell: { type: 'select', config: { items: frozen } } },
			{ accessorKey: 'status', cell: { type: 'select', config: { useItems: useFrozen } } },
		])
	})

	it('hands a component a config with a list and no hook', () => {
		expectTypeOf<SelectCellConfig['items']>().toEqualTypeOf<SelectItem[]>()
		expectTypeOf<SelectCellConfig>().not.toHaveProperty('useItems')
		expectTypeOf<SelectCellConfig>().not.toHaveProperty('getItem')
	})

	it('accepts lists on filtering, editing and creating', () => {
		createColumns<Order>([
			{
				accessorKey: 'status',
				cell: { type: 'select', config: { items: warehouses } },
				filtering: { useItems: () => ({ items: [{ value: 'wh_12', label: 'Berlin', count: 4000 }] }) },
				editing: { useItems: useWarehouses },
				creating: { items: warehouses },
			},
		])
	})
})
