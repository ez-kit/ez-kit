import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../column/create-columns'
import { DEFAULT_PAGE_SIZE } from '../defaults'

import { createTableOptions } from './create-table-options'

import type { ResolvedTableOptions } from './create-table-options'

type Row = { id: string; name: string; age: number }

const rows: Row[] = [
	{ id: '1', name: 'Ada', age: 36 },
	{ id: '2', name: 'Grace', age: 45 },
]

const columns = createColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'age' }])

/**
 * `options` carries no return annotation, so its conditional spreads infer as a union and a key
 * only some members hold cannot be read off it. Whether such a key is there at all is exactly
 * what the gating assertions are about, so they read it through the index signature.
 */
const optionsOf = (resolved: ResolvedTableOptions<Row>): Record<string, unknown> => resolved.options

describe('createTableOptions', () => {
	it('returns no live state wiring — that stays in createTable', () => {
		const { options } = createTableOptions<Row>({ data: rows, columns })

		expect(options).not.toHaveProperty('state')
		expect(options).not.toHaveProperty('onStateChange')
	})

	it('attaches the sorted row model only when sorting is on', () => {
		const on = createTableOptions<Row>({ data: rows, columns, sorting: true })
		const off = createTableOptions<Row>({ data: rows, columns })

		expect(optionsOf(on).getSortedRowModel).toBeTypeOf('function')
		expect(optionsOf(off).getSortedRowModel).toBeUndefined()
		expect(optionsOf(off).enableSorting).toBe(false)
	})

	it('seeds pagination with the default page size', () => {
		const { initialState } = createTableOptions<Row>({ data: rows, columns, pagination: true })

		expect(initialState.pagination?.pageSize).toBe(DEFAULT_PAGE_SIZE)
	})

	it('reports the draft flag from config', () => {
		const plain = createTableOptions<Row>({ data: rows, columns })
		const drafted = createTableOptions<Row>({
			data: rows,
			columns,
			sorting: { manual: true },
			draft: true,
		})

		expect(plain.deferred).toBe(false)
		expect(drafted.deferred).toBe(true)
	})

	it('collects per-feature onChange callbacks without calling them', () => {
		const onSort = vi.fn()
		const { onChange } = createTableOptions<Row>({
			data: rows,
			columns,
			sorting: { onChange: onSort },
		})

		expect(onChange.sorting).toBe(onSort)
		expect(onSort).not.toHaveBeenCalled()
	})

	it('is pure — two calls with the same config agree on every resolved flag', () => {
		const config = { data: rows, columns, sorting: true, pagination: true } as const
		const a = createTableOptions<Row>({ ...config })
		const b = createTableOptions<Row>({ ...config })

		expect(a.options.enableColumnResizing).toBe(b.options.enableColumnResizing)
		expect(a.options.enableRowSelection).toBe(b.options.enableRowSelection)
		expect(a.initialState.pagination).toEqual(b.initialState.pagination)
		expect(a.deferred).toBe(b.deferred)
	})

	it('throws when draft is on without a manual axis', () => {
		expect(() => createTableOptions<Row>({ data: rows, columns, draft: true })).toThrow(/manual/)
	})
})
