import { tableFeatures } from '@tanstack/table-core'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

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

		/** Column identity is core; none of these cases needs a feature registered. */
		const NONE = tableFeatures({})

		// v9 gates the *message* on `NODE_ENV === 'development'` and throws a bare `new Error()`
		// otherwise; v8 gated it on `!== 'production'`, which vitest's own `NODE_ENV=test`
		// satisfied. Two of the cases below are about **which** diagnostic a developer is shown —
		// "an accessorFn" versus "a non-string header" — so they ask for the environment that
		// produces one, rather than settling for "it threw something".
		afterEach(() => {
			vi.unstubAllEnvs()
		})

		it('is not demanded by createTable, which builds columns lazily', () => {
			expect(() => createTable({ features: NONE, data: pairs, columns: [{ accessorFn: sum }] })).not.toThrow()
		})

		it('throws on first column access when there is no id and no string header', () => {
			vi.stubEnv('NODE_ENV', 'development')
			const table = createTable({ features: NONE, data: pairs, columns: [{ accessorFn: sum }] })
			expect(() => table.getAllColumns()).toThrow(/require an id when using an accessorFn/)
		})

		it('is silently taken from a string header when one is present', () => {
			const table = createTable({ features: NONE, data: pairs, columns: [{ accessorFn: sum, header: 'Sum' }] })
			expect(table.getAllColumns().map((column) => column.id)).toEqual(['Sum'])
		})

		it('is not taken from a render-function header', () => {
			vi.stubEnv('NODE_ENV', 'development')
			const table = createTable({ features: NONE, data: pairs, columns: [{ accessorFn: sum, header: () => 'Sum' }] })
			expect(() => table.getAllColumns()).toThrow(/require an id when using an accessorFn/)
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
