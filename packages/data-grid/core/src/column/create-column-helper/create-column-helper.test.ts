import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createColumnHelper } from './create-column-helper'

type Row = {
	id: number
	name: string
	age: number
	status: string
	tier: string
	avatar: string
	url: string
	progress: number
	active: boolean
	createdAt: string
}

describe('createColumnHelper', () => {
	describe('base helpers', () => {
		it('text() produces a ColumnDef with cell.type = "text"', () => {
			const column = createColumnHelper<Row>()
			const col = column.text({ accessorKey: 'name', header: 'Name' })
			expect(col).toEqual({
				accessorKey: 'name',
				header: 'Name',
				cell: { type: 'text' },
			})
		})

		it('number() produces a ColumnDef with cell.type = "number"', () => {
			const column = createColumnHelper<Row>()
			const col = column.number({ accessorKey: 'age', header: 'Age' })
			expect(col.cell).toEqual({ type: 'number' })
			expect(col.accessorKey).toBe('age')
		})

		it('date() produces a ColumnDef with cell.type = "date"', () => {
			const column = createColumnHelper<Row>()
			const col = column.date({ accessorKey: 'createdAt' })
			expect(col.cell).toEqual({ type: 'date' })
		})

		it('boolean() produces a ColumnDef with cell.type = "boolean"', () => {
			const column = createColumnHelper<Row>()
			const col = column.boolean({ accessorKey: 'active' })
			expect(col.cell).toEqual({ type: 'boolean' })
		})

		it('link() produces a ColumnDef with cell.type = "link"', () => {
			const column = createColumnHelper<Row>()
			const col = column.link({ accessorKey: 'url' })
			expect(col.cell).toEqual({ type: 'link' })
		})

		it('preserves pass-through options (sorting, pinning, size, etc.)', () => {
			const column = createColumnHelper<Row>()
			const col = column.text({
				accessorKey: 'name',
				header: 'Name',
				sorting: false,
				pinning: { side: 'left' },
				width: { default: 200, min: 50, max: 500 },
				resizing: false,
			})
			expect(col.sorting).toBe(false)
			expect(col.pinning).toEqual({ side: 'left' })
			expect(col.width).toEqual({ default: 200, min: 50, max: 500 })
			expect(col.resizing).toBe(false)
		})
	})

	describe('config-based helpers', () => {
		it('select() embeds config into cell definition', () => {
			const column = createColumnHelper<Row>()
			const items = [
				{ value: 'a', label: 'A' },
				{ value: 'b', label: 'B' },
			]
			const col = column.select({ accessorKey: 'status', config: { items } })
			expect(col.cell).toEqual({ type: 'select', config: { items } })
		})

		it('badge() embeds config into cell definition', () => {
			const column = createColumnHelper<Row>()
			const items = [{ value: 'pro', label: 'Pro', variant: 'default' as const }]
			const col = column.badge({ accessorKey: 'tier', config: { items } })
			expect(col.cell).toEqual({ type: 'badge', config: { items } })
		})

		it('image() embeds optional config into cell definition', () => {
			const column = createColumnHelper<Row>()
			const config = { alt: 'avatar', width: 32, height: 32 }
			const col = column.image({ accessorKey: 'avatar', config })
			expect(col.cell).toEqual({ type: 'image', config })
		})

		it('image() works without config', () => {
			const column = createColumnHelper<Row>()
			const col = column.image({ accessorKey: 'avatar' })
			expect(col.cell).toEqual({ type: 'image', config: undefined })
		})

		it('progress() embeds optional config into cell definition', () => {
			const column = createColumnHelper<Row>()
			const col = column.progress({ accessorKey: 'progress', config: { max: 100 } })
			expect(col.cell).toEqual({ type: 'progress', config: { max: 100 } })
		})

		it('progress() works without config', () => {
			const column = createColumnHelper<Row>()
			const col = column.progress({ accessorKey: 'progress' })
			expect(col.cell).toEqual({ type: 'progress', config: undefined })
		})

		it('does not leak config to the top-level ColumnDef', () => {
			const column = createColumnHelper<Row>()
			const col = column.select({
				accessorKey: 'status',
				config: { items: [{ value: 'a', label: 'A' }] },
			})
			expect((col as { config?: unknown }).config).toBeUndefined()
		})
	})

	describe('cell.component on a generated method', () => {
		it('keeps the method-owned type and the typed config beside the view renderer', () => {
			const column = createColumnHelper<Row>()
			const component = vi.fn()
			const col = column.number({ accessorKey: 'age', config: { decimals: 2 }, cell: { component } })
			expect(col.cell).toEqual({ type: 'number', config: { decimals: 2 }, component })
		})

		it('does not leak the cell key twice — the type still wins over an omitted one', () => {
			const column = createColumnHelper<Row>()
			const component = vi.fn()
			const col = column.text({ accessorKey: 'name', cell: { component } })
			expect(col.cell).toEqual({ type: 'text', component })
		})
	})

	describe('custom()', () => {
		it('produces a bare ColumnDef when no type/cell/config provided', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', header: 'Name' })
			expect(col).toEqual({ accessorKey: 'name', header: 'Name' })
			expect(col.cell).toBeUndefined()
		})

		it('builds cell from type, config, and cell.component', () => {
			const column = createColumnHelper<Row>()
			const component = vi.fn().mockReturnValue('rendered')
			const config = { foo: 'bar' }
			const col = column.custom({
				accessorKey: 'name',
				type: 'rating',
				config,
				cell: { component },
			})
			expect(col.cell).toEqual({ type: 'rating', config, component })
		})

		it('builds cell when only cell.component is provided', () => {
			const column = createColumnHelper<Row>()
			const component = vi.fn()
			const col = column.custom({ accessorKey: 'name', cell: { component } })
			expect(col.cell).toEqual({ component })
		})

		it('builds cell when only config is provided', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', config: { foo: 1 } })
			expect(col.cell).toEqual({ config: { foo: 1 } })
		})

		it('sets editing to false when editing === false', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', editing: false })
			expect(col.editing).toBe(false)
		})

		it('passes an editing config through unchanged — same shape as ColumnDef', () => {
			const column = createColumnHelper<Row>()
			const component = vi.fn()
			const col = column.custom({
				accessorKey: 'name',
				editing: { component, description: 'Two letters' },
			})
			expect(col.editing).toEqual({ component, description: 'Two letters' })
		})

		it('sets creating to false when creating === false', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', creating: false })
			expect(col.creating).toBe(false)
		})

		it('passes a creating config through unchanged — same shape as ColumnDef', () => {
			const column = createColumnHelper<Row>()
			const component = vi.fn()
			const col = column.custom({ accessorKey: 'name', creating: { component, defaultValue: 'x' } })
			expect(col.creating).toEqual({ component, defaultValue: 'x' })
		})

		it('omits editing/creating when not provided', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', type: 'rating' })
			expect(col.editing).toBeUndefined()
			expect(col.creating).toBeUndefined()
		})

		it('preserves pass-through options like header, sorting, size', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({
				accessorKey: 'name',
				header: 'Name',
				sorting: false,
				width: 120,
			})
			expect(col.header).toBe('Name')
			expect(col.sorting).toBe(false)
			expect(col.width).toBe(120)
		})

		it('does not leak type/config to top-level ColumnDef', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({
				accessorKey: 'name',
				type: 'rating',
				config: { foo: 'bar' },
				cell: { component: vi.fn() },
				editing: { component: vi.fn() },
				creating: { component: vi.fn() },
			})
			expect((col as { type?: unknown }).type).toBeUndefined()
			expect((col as { config?: unknown }).config).toBeUndefined()
		})
	})

	describe('registered custom types', () => {
		// A registry is now the second type parameter, not a union of ids: that is what carries
		// each type's own config through to the generated method.
		type RatingConfig = { max: number }
		type Registry = {
			rating: { __config?: RatingConfig }
			currency: { __config?: { code: string } }
		}

		it('registers a helper for each registered type', () => {
			const column = createColumnHelper<Row, Registry>(['rating', 'currency'])
			expect(typeof column.rating).toBe('function')
			expect(typeof column.currency).toBe('function')
		})

		it('registered helper produces cell with the right type and forwarded config', () => {
			const column = createColumnHelper<Row, Pick<Registry, 'rating'>>(['rating'])
			const col = column.rating({ accessorKey: 'progress', config: { max: 5 } })
			expect(col.cell).toEqual({ type: 'rating', config: { max: 5 } })
		})

		it('omits the config key entirely when a type declares none', () => {
			type NoConfig = { plain: Record<never, never> }
			const column = createColumnHelper<Row, NoConfig>(['plain'])
			const col = column.plain({ accessorKey: 'progress' })
			expect(col.cell).toEqual({ type: 'plain' })
		})

		it('registered helper preserves pass-through options', () => {
			const column = createColumnHelper<Row, Pick<Registry, 'rating'>>(['rating'])
			const col = column.rating({
				accessorKey: 'progress',
				config: { max: 5 },
				header: 'Score',
				sorting: false,
			})
			expect(col.accessorKey).toBe('progress')
			expect(col.header).toBe('Score')
			expect(col.sorting).toBe(false)
		})

		it('registered helper does not leak config to top-level ColumnDef', () => {
			const column = createColumnHelper<Row, Pick<Registry, 'rating'>>(['rating'])
			const col = column.rating({ accessorKey: 'progress', config: { max: 5 } })
			expect((col as { config?: unknown }).config).toBeUndefined()
		})

		it('offers exactly the registered ids — the base contract only when nothing is passed', () => {
			const bound = createColumnHelper<Row, Pick<Registry, 'rating'>>(['rating'])
			expect(bound).not.toHaveProperty('text')

			const unbound = createColumnHelper<Row>()
			expect(unbound).not.toHaveProperty('rating')
			expect(typeof unbound.text).toBe('function')
		})

		it('each registered helper builds an independent ColumnDef per call (no shared state)', () => {
			const column = createColumnHelper<Row, Pick<Registry, 'rating'>>(['rating'])
			const a = column.rating({ accessorKey: 'progress', config: { max: 5 } })
			const b = column.rating({ accessorKey: 'progress', config: { max: 10 } })
			expect(a.cell).toEqual({ type: 'rating', config: { max: 5 } })
			expect(b.cell).toEqual({ type: 'rating', config: { max: 10 } })
			expect(a).not.toBe(b)
		})
	})

	describe('computed()', () => {
		it('types the cell value from what accessorFn returns', () => {
			const column = createColumnHelper<Row>()

			column.computed({
				id: 'ageInDays',
				accessorFn: (row) => row.age * 365,
				cellClassName: (ctx) => {
					expectTypeOf(ctx.value).toEqualTypeOf<number>()
					expectTypeOf(ctx.row).toEqualTypeOf<Row>()
					return undefined
				},
				cell: {
					component: (ctx) => {
						expectTypeOf(ctx.value).toEqualTypeOf<number>()
						return undefined
					},
				},
			})

			column.computed({
				id: 'label',
				accessorFn: (row) => `${row.name} (${row.tier})`,
				cellClassName: (ctx) => {
					expectTypeOf(ctx.value).toEqualTypeOf<string>()
					return undefined
				},
			})
		})

		it('requires an id — there is no accessorKey to derive one from', () => {
			const column = createColumnHelper<Row>()
			// @ts-expect-error `id` is required on a computed column
			column.computed({ accessorFn: (row) => row.age })
		})

		// The negative control for the two positive cases above. `expectTypeOf(...).toEqualTypeOf`
		// is bidirectional, so it already rejects `unknown` and `any` — but an assertion that
		// cannot fail is worse than none, so this pins that the inference is doing real work:
		// a numeric accessorFn must NOT give the cell a string value.
		it('does not widen or mistype the inferred value', () => {
			const column = createColumnHelper<Row>()

			column.computed({
				id: 'ageInDays',
				accessorFn: (row) => row.age * 365,
				cellClassName: (ctx) => {
					// @ts-expect-error accessorFn returns a number, so `value` is not a string
					expectTypeOf(ctx.value).toEqualTypeOf<string>()
					// @ts-expect-error nor is it left as unknown
					expectTypeOf(ctx.value).toEqualTypeOf<unknown>()
					return undefined
				},
			})
		})

		it('carries the accessorFn through to the ColumnDef', () => {
			const column = createColumnHelper<Row>()
			const accessorFn = (row: Row) => row.age * 2
			const def = column.computed({ id: 'doubled', accessorFn })

			expect(def.id).toBe('doubled')
			expect(def.accessorFn).toBe(accessorFn)
			expect(def.cell).toBeUndefined()
		})

		it('accepts the same loose type/config escape hatch custom() has', () => {
			const column = createColumnHelper<Row>()
			const def = column.computed({
				id: 'score',
				accessorFn: (row) => row.progress,
				type: 'rating',
				config: { max: 5 },
			})

			expect(def.cell).toEqual({ type: 'rating', config: { max: 5 } })
		})

		it('does not mutate the input opts object', () => {
			const column = createColumnHelper<Row>()
			const opts = { id: 'doubled', accessorFn: (row: Row) => row.age * 2, type: 'rating' }
			const keys = Object.keys(opts).sort()
			column.computed(opts)
			expect(Object.keys(opts).sort()).toEqual(keys)
			expect(opts.type).toBe('rating')
		})
	})

	describe('immutability', () => {
		it('does not mutate the input opts object', () => {
			const column = createColumnHelper<Row>()
			const opts = { accessorKey: 'status' as const, config: { items: [{ value: 'a', label: 'A' }] } }
			const snapshot = JSON.parse(JSON.stringify(opts)) as typeof opts
			column.select(opts)
			expect(opts).toEqual(snapshot)
		})

		it('custom() does not mutate the input opts object', () => {
			const column = createColumnHelper<Row>()
			const opts = {
				accessorKey: 'name' as const,
				type: 'rating',
				config: { foo: 'bar' },
				cell: { component: vi.fn() },
				editing: { component: vi.fn() },
				creating: { component: vi.fn() },
			}
			const keys = Object.keys(opts).sort()
			column.custom(opts)
			expect(Object.keys(opts).sort()).toEqual(keys)
			expect(opts.type).toBe('rating')
			expect(opts.config).toEqual({ foo: 'bar' })
		})
	})
})
