import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveFilterFields } from '../../create-table/resolve-filter-fields'

import { mapColumns } from './map-columns'

import type { ColumnDef, ColumnFilteringMeta, MappedColumnDef, SelectItem } from '../types'

type Row = { id: string; warehouse: { id: string; name: string }; status: string }

const warehouses: SelectItem[] = [{ value: 'wh_12', label: 'Berlin' }]
const useWarehouses = () => ({ items: warehouses, isLoading: false })
const useActiveWarehouses = () => ({ items: warehouses })
const getWarehouse = (row: Row): SelectItem => ({ value: row.warehouse.id, label: row.warehouse.name })

function filteringMeta(def: MappedColumnDef<Row> | undefined): ColumnFilteringMeta | undefined {
	const filtering = def?.meta?.filtering
	return filtering === false ? undefined : filtering
}

function mapOne(def: ColumnDef<Row>): MappedColumnDef<Row> | undefined {
	return mapColumns<Row>([def])[0]
}

describe('mapColumns — value lists', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('lifts `useItems` and `getItem` out of a select config onto the cell meta', () => {
		const column = mapOne({
			id: 'warehouse',
			accessorFn: (row) => row.warehouse.id,
			cell: { type: 'select', config: { useItems: useWarehouses, getItem: getWarehouse } },
		})

		expect(column?.meta?.cell?.useItems).toBe(useWarehouses)
		expect(column?.meta?.cell?.getItem).toBe(getWarehouse)
		expect(column?.meta?.cell?.config).toEqual({})
	})

	it('keeps a static list in config and adds no source keys', () => {
		const column = mapOne({ accessorKey: 'status', cell: { type: 'badge', config: { items: warehouses } } })

		expect(column?.meta?.cell?.config).toEqual({ items: warehouses })
		expect(column?.meta?.cell).not.toHaveProperty('useItems')
		expect(column?.meta?.cell).not.toHaveProperty('getItem')
	})

	it('carries `filtering.useItems` onto the filtering meta, and nothing without it', () => {
		const withHook = mapOne({ accessorKey: 'status', filtering: { useItems: useWarehouses } })
		const without = mapOne({ accessorKey: 'status', filtering: { debounce: 10 } })

		expect(filteringMeta(withHook)?.useItems).toBe(useWarehouses)
		expect(filteringMeta(without)).not.toHaveProperty('useItems')
	})

	it('carries the editing and creating lists on their meta as written', () => {
		const column = mapOne({
			accessorKey: 'status',
			cell: { type: 'select', config: { useItems: useWarehouses } },
			editing: { useItems: useActiveWarehouses },
			creating: { items: warehouses },
		})

		const { editing, creating } = column?.meta ?? {}
		expect(editing !== false && editing?.useItems).toBe(useActiveWarehouses)
		expect(creating !== false && creating?.items).toBe(warehouses)
	})

	it('leaves the config of a non-list cell type untouched', () => {
		const config = { alt: 'logo' }
		const column = mapOne({ accessorKey: 'status', cell: { type: 'image', config } })

		expect(column?.meta?.cell?.config).toBe(config)
	})

	it('warns once, naming the column and the level, when `items` and `useItems` meet', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const status: ColumnDef<Row> = {
			accessorKey: 'status',
			filtering: { items: warehouses, useItems: useWarehouses },
		}

		const column = mapOne(status)
		mapOne(status)

		const messages = warn.mock.calls.map((call) => String(call[0]))
		expect(messages).toHaveLength(1)
		expect(messages[0]).toContain('Column "status"')
		expect(messages[0]).toContain('`filtering.items`')
		expect(messages[0]).toContain('`filtering.useItems`')
		expect(filteringMeta(column)?.useItems).toBe(useWarehouses)
	})

	it.each([
		['cell.config', { cell: { type: 'select', config: { items: warehouses, useItems: useWarehouses } } }],
		['editing', { editing: { items: warehouses, useItems: useWarehouses } }],
		['creating', { creating: { items: warehouses, useItems: useWarehouses } }],
	] as const)('warns about both lists at the %s level', (level, def) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		mapOne({ id: `both-${level}`, accessorKey: 'status', ...def })

		expect(String(warn.mock.calls[0]?.[0])).toContain(`\`${level}.useItems\``)
	})

	it('lifts a filter field’s list hook out of its cell config', () => {
		const [field] = resolveFilterFields(
			[{ id: 'warehouse', header: 'Warehouse', cell: { type: 'select', config: { useItems: useWarehouses } } }],
			[],
			true,
			{},
		)

		expect(field?.cell.useItems).toBe(useWarehouses)
		expect(field?.cell.config).toEqual({})
	})
})
