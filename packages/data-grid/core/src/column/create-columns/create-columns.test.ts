import { describe, expect, expectTypeOf, it } from 'vitest'

import { createTable } from '../../create-table'

import { createColumns } from './create-columns'

type Row = {
	id: string
	name: string
	total: number
	active: boolean
}

describe('createColumns', () => {
	it('returns the same array it was given', () => {
		const defs = [{ accessorKey: 'name' as const }]
		expect(createColumns<Row>(defs)).toBe(defs)
	})

	// Why `createColumnHelper().computed()` requires an `id` while a plain ColumnDef does not.
	// Pinned here because the requirement is stricter than the runtime, and the reason is the
	// string-header fallback below rather than the throw.
	describe('a column id for an accessorFn column', () => {
		type Pair = { a: number; b: number }
		const pairs: Pair[] = [{ a: 1, b: 2 }]
		const sum = (row: Pair) => row.a + row.b

		it('is not demanded by createTable, which builds columns lazily', () => {
			expect(() => createTable<Pair>({ data: pairs, columns: [{ accessorFn: sum }] })).not.toThrow()
		})

		it('throws on first column access when there is no id and no string header', () => {
			const table = createTable<Pair>({ data: pairs, columns: [{ accessorFn: sum }] })
			expect(() => table.getAllColumns()).toThrow(/Columns require an id when using an accessorFn/)
		})

		it('is silently taken from a string header when one is present', () => {
			const table = createTable<Pair>({ data: pairs, columns: [{ accessorFn: sum, header: 'Sum' }] })
			expect(table.getAllColumns().map((column) => column.id)).toEqual(['Sum'])
		})

		it('is not taken from a render-function header', () => {
			const table = createTable<Pair>({ data: pairs, columns: [{ accessorFn: sum, header: () => 'Sum' }] })
			expect(() => table.getAllColumns()).toThrow(/Columns require an id when using an accessorFn/)
		})
	})

	describe('cell value typing', () => {
		it('types `value` from `accessorKey` in cellClassName, cell.component and creating.defaultValue', () => {
			createColumns<Row>([
				{
					accessorKey: 'total',
					cellClassName: (ctx) => {
						expectTypeOf(ctx.value).toEqualTypeOf<number>()
						expectTypeOf(ctx.row).toEqualTypeOf<Row>()
						return ctx.value < 0 ? 'negative' : undefined
					},
					cell: {
						component: (ctx) => {
							expectTypeOf(ctx.value).toEqualTypeOf<number>()
							return undefined
						},
					},
					creating: { defaultValue: 0 },
				},
				{
					accessorKey: 'name',
					cellClassName: (ctx) => {
						expectTypeOf(ctx.value).toEqualTypeOf<string>()
						return undefined
					},
				},
			])
		})

		it('rejects a creating.defaultValue of the wrong type for the column', () => {
			createColumns<Row>([
				// @ts-expect-error `active` is a boolean column; a string is not a legal seed
				{
					accessorKey: 'active',
					creating: { defaultValue: 'yes' },
				},
			])
		})

		it('leaves `value` as unknown on a display column, which has no value to type', () => {
			createColumns<Row>([
				{
					id: 'actions',
					cellClassName: (ctx) => {
						expectTypeOf(ctx.value).toEqualTypeOf<unknown>()
						return undefined
					},
				},
			])
		})

		it('leaves `value` as unknown on an accessorFn column written as a plain object', () => {
			// The documented gap: a union arm has no inference variable to bind accessorFn's
			// return type to. `createColumnHelper().computed()` is the typed route.
			createColumns<Row>([
				{
					id: 'derived',
					accessorFn: (row) => row.total * 2,
					cellClassName: (ctx) => {
						expectTypeOf(ctx.value).toEqualTypeOf<unknown>()
						return undefined
					},
				},
			])
		})
	})
})
