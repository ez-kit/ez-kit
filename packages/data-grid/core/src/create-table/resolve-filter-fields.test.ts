import { columnFilteringFeature, createFilteredRowModel, filterFns, tableFeatures } from '@tanstack/table-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createColumns } from '../column/create-columns'
import { SELECTION_COLUMN_ID } from '../system-columns/system-columns'

import { createTableOptions } from './create-table-options'

import type { FilterFieldDef } from '../column/types'

type Row = { id: string; name: string; status: string }

const columns = createColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'status' }])

const features = tableFeatures({
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

const WAREHOUSE_ITEMS = [
	{ value: 'msk', label: 'Moscow' },
	{ value: 'spb', label: 'Saint Petersburg' },
]

const warehouse: FilterFieldDef = {
	id: 'warehouse',
	header: 'Warehouse',
	cell: { type: 'select', config: { items: WAREHOUSE_ITEMS } },
	filtering: { operators: true },
}

function resolve(filtering: object, extra: object = {}) {
	return createTableOptions({ features, data: [] as Row[], columns, filtering, ...extra })
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('filtering.fields', () => {
	it('resolves a select field to the select operators and keeps its items', () => {
		const { grid } = resolve({ manual: true, fields: [warehouse] })

		const [field] = grid.filterFields ?? []
		expect(field?.id).toBe('warehouse')
		expect(field?.label).toBe('Warehouse')
		expect(field?.cell).toEqual({ type: 'select', config: { items: WAREHOUSE_ITEMS } })
		expect(field?.filtering?.operators?.map((op) => op.id)).toContain('in')
		expect(field?.filtering?.defaultOperator).toBe('in')
	})

	it('keeps its `filtering.placeholder`', () => {
		const { grid } = resolve({
			manual: true,
			fields: [{ id: 'warehouse', header: 'Warehouse', filtering: { placeholder: 'Warehouse code' } }],
		})

		expect(grid.filterFields?.[0]?.filtering?.placeholder).toBe('Warehouse code')
	})

	it('is never faceted, even under a table-wide `faceted: true`', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { grid } = resolve({ manual: true, faceted: true, fields: [warehouse] })

		expect(grid.filterFields?.[0]?.filtering?.faceted).toBeUndefined()
	})

	it('inherits the table-wide `operators: true`', () => {
		const { grid } = resolve({ manual: true, operators: true, fields: [{ id: 'region', header: 'Region' }] })

		expect(grid.filterFields?.[0]?.cell).toEqual({ type: 'text' })
		expect(grid.filterFields?.[0]?.filtering?.operators?.length).toBeGreaterThan(0)
	})

	it('throws on a field id that repeats a column id', () => {
		expect(() => resolve({ manual: true, fields: [{ id: 'status', header: 'Status' }] })).toThrow('"status"')
	})

	it('throws on a field id that repeats a system column id', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		expect(() =>
			resolve({ manual: true, fields: [{ id: SELECTION_COLUMN_ID, header: 'Selected' }] }, { selection: true }),
		).toThrow(`"${SELECTION_COLUMN_ID}"`)
	})

	it('throws on a field id that repeats a nested column or a group id', () => {
		const grouped = createColumns<Row>([
			{ id: 'person', header: 'Person', columns: [{ accessorKey: 'name' }, { accessorKey: 'status' }] },
		])
		const build = (id: string) =>
			createTableOptions({
				features,
				data: [] as Row[],
				columns: grouped,
				filtering: { manual: true, fields: [{ id, header: id }] },
			})

		expect(() => build('status')).toThrow('"status"')
		expect(() => build('person')).toThrow('"person"')
	})

	it('names a misconfigured field as a field in its warnings', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		resolve({ manual: true, fields: [{ id: 'region', header: 'Region', filtering: { presets: true } }] })

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('Filter field "region"'))
	})

	it('throws on two fields with one id', () => {
		const region = { id: 'region', header: 'Region' }
		expect(() => resolve({ manual: true, fields: [region, region] })).toThrow('"region"')
	})

	it('warns once and offers no fields without `filtering.manual: true`', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { grid } = resolve({ fields: [warehouse, { id: 'region', header: 'Region' }] })

		expect(grid.filterFields).toBeUndefined()
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('filtering.manual')
	})

	it('stays quiet and offers nothing for a table that declares no fields', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { grid } = resolve({ manual: true })

		expect(grid.filterFields).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})
})
