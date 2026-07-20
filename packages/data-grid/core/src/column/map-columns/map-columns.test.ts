import { describe, expect, it, vi } from 'vitest'

import { buildOperatorRegistry } from '../../features/operators'

import { mapColumns } from './map-columns'

import type { ColumnDef } from '../types'

type Row = {
	id: number
	name: string
	age: number
}

describe('mapColumns', () => {
	it('maps accessorKey to TanStack column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', header: 'Name' }])
		expect(result).toHaveLength(1)
		if (!result[0]) throw new Error('expected column')
		const col = result[0]
		expect((col as { accessorKey?: string }).accessorKey).toBe('name')
		expect(col.header).toBe('Name')
	})

	it('sorting: false → enableSorting: false', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: false }])
		expect(result[0]?.enableSorting).toBe(false)
	})

	it('sorting: { descFirst: true } → sortDescFirst on the column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { descFirst: true } }])
		expect(result[0]?.sortDescFirst).toBe(true)
	})

	it('sorting: { fn: "datetime" } → sortingFn passed through as a built-in name', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { fn: 'datetime' } }])
		expect(result[0]?.sortingFn).toBe('datetime')
	})

	it('sorting: { fn: <inline> } → sortingFn passed through as a function', () => {
		const fn = (_a: unknown, _b: unknown) => 0
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { fn } }])
		expect(result[0]?.sortingFn).toBe(fn)
	})

	it("sorting: { undefined: 'last' } → sortUndefined: 'last'", () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { undefined: 'last' } }])
		expect(result[0]?.sortUndefined).toBe('last')
	})

	it('sorting: { invert: true } → invertSorting: true', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { invert: true } }])
		expect(result[0]?.invertSorting).toBe(true)
	})

	it('sorting: { multi: false } → enableMultiSort: false on the column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { multi: false } }])
		expect(result[0]?.enableMultiSort).toBe(false)
	})

	it('sorting object does not set enableSorting (column stays sortable)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', sorting: { descFirst: true } }])
		expect(result[0]?.enableSorting).toBeUndefined()
	})

	it('visibility: true → enableHiding: false (column is locked)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', visibility: true }])
		expect(result[0]?.enableHiding).toBe(false)
	})

	it('visibility: { defaultHidden: true } does not lock the column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', visibility: { defaultHidden: true } }])
		expect(result[0]?.enableHiding).toBeUndefined()
	})

	it('visibility omitted → column stays hideable (enableHiding undefined)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }])
		expect(result[0]?.enableHiding).toBeUndefined()
	})

	it('pinning: { pin: left } goes into meta.columnPinning', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: { pin: 'left' } }])
		expect(result[0]?.meta?.columnPinning).toEqual({ pin: 'left' })
	})

	it('pinning: { defaultPin: right } goes into meta.columnPinning', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: { defaultPin: 'right' } }])
		expect(result[0]?.meta?.columnPinning).toEqual({ defaultPin: 'right' })
	})

	it('pinning: false goes into meta.columnPinning as false', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', pinning: false }])
		expect(result[0]?.meta?.columnPinning).toBe(false)
	})

	it('filtering goes into meta.filtering', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { component } }])
		expect(result[0]?.meta?.filtering).toEqual({ component })
	})

	it('filtering: false goes into meta', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: false }])
		expect(result[0]?.meta?.filtering).toBe(false)
	})

	it('cell.type goes into meta.cellType', () => {
		const result = mapColumns<Row>([{ accessorKey: 'age', cell: { type: 'number' } }])
		expect(result[0]?.meta?.cellType).toBe('number')
	})

	it('defaults meta.cellType to "text" when cell.type is omitted', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name' }])
		expect(result[0]?.meta?.cellType).toBe('text')
	})

	it('forwards creating.description to meta.creating.description', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', creating: { description: 'Choose a unique name' } }])
		const created = result[0]?.meta?.creating
		const description = created !== false ? created?.description : undefined
		expect(description).toBe('Choose a unique name')
	})

	it('forwards editing.description to meta.editing.description', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', editing: { description: 'Cannot be changed once saved' } }])
		const edited = result[0]?.meta?.editing
		const description = edited !== false ? edited?.description : undefined
		expect(description).toBe('Cannot be changed once saved')
	})

	it('maps nested column groups', () => {
		const defs: ColumnDef<Row>[] = [
			{
				header: 'Group',
				columns: [{ accessorKey: 'name' }, { accessorKey: 'age' }],
			},
		]
		const result = mapColumns(defs)
		expect((result[0] as { columns?: unknown[] }).columns).toHaveLength(2)
	})

	it('cell.component maps to TanStack cell renderer and meta.cellView', () => {
		const component = vi.fn().mockReturnValue('custom')
		const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
		expect(result[0]?.cell).toBeTypeOf('function')
		expect(result[0]?.meta?.cellView).toBeTypeOf('function')
	})

	it('cell.component invoked as TanStack cell renderer', () => {
		const component = vi.fn().mockReturnValue('component-result')
		const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
		type CellCtx = {
			row: { original: Row; index: number }
			getValue: () => unknown
		}
		const ctx: CellCtx = { row: { original: { id: 1, name: 'x', age: 0 }, index: 0 }, getValue: () => 'x' }
		const cellFn = result[0]?.cell as ((c: CellCtx) => unknown) | undefined
		cellFn?.(ctx)
		expect(component).toHaveBeenCalled()
	})

	it('filtering.component stored in meta.filtering', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { component } }])
		expect((result[0]?.meta?.filtering as { component?: unknown } | undefined)?.component).toBe(component)
	})

	it('editing.component stored in meta.editing', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', editing: { component } }])
		expect((result[0]?.meta?.editing as { component?: unknown } | undefined)?.component).toBe(component)
	})

	it('creating.component stored in meta.creating', () => {
		const component = vi.fn()
		const result = mapColumns<Row>([{ accessorKey: 'name', creating: { component } }])
		expect((result[0]?.meta?.creating as { component?: unknown } | undefined)?.component).toBe(component)
	})

	it('passes size, minSize, maxSize to TanStack column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', size: 200, minSize: 50, maxSize: 500 }])
		expect(result[0]?.size).toBe(200)
		expect(result[0]?.minSize).toBe(50)
		expect(result[0]?.maxSize).toBe(500)
	})

	it('passes enableResizing: false to TanStack column', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', enableResizing: false }])
		expect(result[0]?.enableResizing).toBe(false)
	})

	it('filtering.options is forwarded to meta.filteringOptions', () => {
		const options = [
			{ value: 'a', label: 'A' },
			{ value: 'b', label: 'B' },
		]
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { options } }])
		expect(result[0]?.meta?.filteringOptions).toEqual(options)
	})

	it('column.filtering.faceted: true → meta.facetedEnabled = true (overrides table flag)', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { faceted: true } }], undefined, {
			tableFaceted: false,
		})
		expect(result[0]?.meta?.facetedEnabled).toBe(true)
	})

	it('column.filtering.faceted: false → meta.facetedEnabled is not set even when table-level is on', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { faceted: false } }], undefined, {
			tableFaceted: true,
		})
		expect(result[0]?.meta?.facetedEnabled).toBeUndefined()
	})

	it('table-level tableFaceted: true inherits to column meta when column does not override', () => {
		const result = mapColumns<Row>([{ accessorKey: 'name', filtering: {} }], undefined, { tableFaceted: true })
		expect(result[0]?.meta?.facetedEnabled).toBe(true)
	})

	it('select cell with operators: true resolves to in/notIn defaults', () => {
		const registry = buildOperatorRegistry()
		const result = mapColumns<Row>(
			[
				{
					accessorKey: 'name',
					cell: { type: 'select', config: { items: [{ value: 'a', label: 'A' }] } },
					filtering: { operators: true },
				},
			],
			registry,
		)
		const resolved = result[0]?.meta?.resolvedOperators
		expect(resolved?.map((o) => o.id)).toEqual(['in', 'notIn', 'isEmpty', 'isNotEmpty'])
		expect(result[0]?.meta?.defaultOperatorId).toBe('in')
	})
})
