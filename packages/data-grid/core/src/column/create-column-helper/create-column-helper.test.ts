import { describe, expect, it, vi } from 'vitest'

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
				size: 200,
				minSize: 50,
				maxSize: 500,
				resizing: false,
			})
			expect(col.sorting).toBe(false)
			expect(col.pinning).toEqual({ side: 'left' })
			expect(col.size).toBe(200)
			expect(col.minSize).toBe(50)
			expect(col.maxSize).toBe(500)
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

	describe('custom()', () => {
		it('produces a bare ColumnDef when no type/view/config provided', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', header: 'Name' })
			expect(col).toEqual({ accessorKey: 'name', header: 'Name' })
			expect(col.cell).toBeUndefined()
		})

		it('builds cell from type, config, and view', () => {
			const column = createColumnHelper<Row>()
			const view = vi.fn().mockReturnValue('rendered')
			const config = { foo: 'bar' }
			const col = column.custom({
				accessorKey: 'name',
				type: 'rating',
				config,
				view,
			})
			expect(col.cell).toEqual({ type: 'rating', config, component: view })
		})

		it('builds cell when only view is provided', () => {
			const column = createColumnHelper<Row>()
			const view = vi.fn()
			const col = column.custom({ accessorKey: 'name', view })
			expect(col.cell).toEqual({ type: undefined, config: undefined, component: view })
		})

		it('builds cell when only config is provided', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', config: { foo: 1 } })
			expect(col.cell).toEqual({ type: undefined, config: { foo: 1 }, component: undefined })
		})

		it('sets editing to false when editing === false', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', editing: false })
			expect(col.editing).toBe(false)
		})

		it('wraps editing component into { component }', () => {
			const column = createColumnHelper<Row>()
			const editing = vi.fn()
			const col = column.custom({ accessorKey: 'name', editing })
			expect(col.editing).toEqual({ component: editing })
		})

		it('sets creating to false when creating === false', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({ accessorKey: 'name', creating: false })
			expect(col.creating).toBe(false)
		})

		it('wraps creating component into { component }', () => {
			const column = createColumnHelper<Row>()
			const creating = vi.fn()
			const col = column.custom({ accessorKey: 'name', creating })
			expect(col.creating).toEqual({ component: creating })
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
				size: 120,
			})
			expect(col.header).toBe('Name')
			expect(col.sorting).toBe(false)
			expect(col.size).toBe(120)
		})

		it('does not leak type/config/view/editing/creating to top-level ColumnDef', () => {
			const column = createColumnHelper<Row>()
			const col = column.custom({
				accessorKey: 'name',
				type: 'rating',
				config: { foo: 'bar' },
				view: vi.fn(),
				editing: vi.fn(),
				creating: vi.fn(),
			})
			expect((col as { type?: unknown }).type).toBeUndefined()
			expect((col as { config?: unknown }).config).toBeUndefined()
			expect((col as { view?: unknown }).view).toBeUndefined()
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
				view: vi.fn(),
				editing: vi.fn(),
				creating: vi.fn(),
			}
			const keys = Object.keys(opts).sort()
			column.custom(opts)
			expect(Object.keys(opts).sort()).toEqual(keys)
			expect(opts.type).toBe('rating')
			expect(opts.config).toEqual({ foo: 'bar' })
		})
	})
})
