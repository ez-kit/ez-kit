import { rowPaginationFeature, tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

import { INITIAL_INFINITE_STATE, infiniteFeature } from './infinite'

import type { InfiniteState } from '../../types'

type Row = { id: number; name: string }

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const INFINITE = tableFeatures({ infiniteFeature })

/**
 * Infinite scrolling is a `pagination` mode, so a config literal naming `pagination` registers
 * `rowPaginationFeature` too — `createTable` warns otherwise, and rightly: the option would
 * reach nothing. `paginatedRowModel` is deliberately **absent**: infinite mode shows every
 * accumulated row, and registering the model would slice them back to one page. `createTable`
 * warns about that too.
 */
const INFINITE_PAGINATION = tableFeatures({ infiniteFeature, rowPaginationFeature })

/** The slice the table currently holds. From a test the feature set is resolved, so this reads
 * the atom directly — `../../feature-state` is for feature code, where it is not. */
const infiniteOf = (table: { atoms: { infinite: { get: () => InfiniteState } } }): InfiniteState =>
	table.atoms.infinite.get()

const makeTable = (config: object = {}) => createTable({ features: INFINITE, data: DATA, columns: COLUMNS, ...config })

describe('infiniteFeature — state (100% grid-owned)', () => {
	it('seeds state.infinite with fetching flags false and error null', () => {
		expect(infiniteOf(makeTable())).toEqual({
			isFetchingNextPage: false,
			isFetchingPreviousPage: false,
			error: null,
		})
	})

	it('INITIAL_INFINITE_STATE constant matches the seeded slice', () => {
		expect(infiniteOf(makeTable())).toEqual(INITIAL_INFINITE_STATE)
	})

	it('does not hold hasNextPage in state (it is a pagination option, not state)', () => {
		const table = createTable({
			features: INFINITE_PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { mode: 'infinite', hasNextPage: true },
		})

		expect('hasNextPage' in infiniteOf(table)).toBe(false)
	})

	it('contributes neither the slice nor the APIs to a table that does not register it', () => {
		// D1, demonstrated: omit the feature and the grid has no `state.infinite`, no
		// `setInfiniteStatus`, and no `appendData` / `prependData`.
		//
		// Each read is a `@ts-expect-error`, which is the type half of the same claim: with the
		// feature out of the set these members do not *exist* on the table, and the directive fails
		// the build the day one of them starts existing unconditionally again.
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })

		// @ts-expect-error — the `infinite` atom belongs to `infiniteFeature`
		expect(table.atoms.infinite).toBeUndefined()
		// @ts-expect-error — so does its writer
		expect(table.setInfiniteStatus).toBeUndefined()
		// @ts-expect-error — and both page appenders
		expect(table.appendData).toBeUndefined()
		// @ts-expect-error — likewise
		expect(table.prependData).toBeUndefined()
	})
})

describe('infiniteFeature — setInfiniteStatus', () => {
	it('merges partial updates without clobbering other fields', () => {
		const table = makeTable()

		table.setInfiniteStatus({ isFetchingNextPage: true })
		expect(infiniteOf(table).isFetchingNextPage).toBe(true)
		expect(infiniteOf(table).error).toBeNull()

		table.setInfiniteStatus({ error: { direction: 'forward', error: new Error('boom') } })
		expect(infiniteOf(table).isFetchingNextPage).toBe(true)
		expect((infiniteOf(table).error?.error as Error).message).toBe('boom')
	})
})

describe('appendData / prependData — immutability', () => {
	it('appendData builds a new array after current data, leaving the previous untouched', () => {
		const table = makeTable()
		const prev = table.options.data

		table.appendData([{ id: 3, name: 'Carol' }])

		expect(table.options.data).not.toBe(prev)
		expect(prev).toHaveLength(2)
		expect(table.options.data.map((row: Row) => row.name)).toEqual(['Alice', 'Bob', 'Carol'])
	})

	it('prependData inserts before current data immutably', () => {
		const table = makeTable()

		table.prependData([{ id: 0, name: 'Zero' }])

		expect(table.options.data.map((row: Row) => row.name)).toEqual(['Zero', 'Alice', 'Bob'])
	})

	it('both reach the row model, not only the options', () => {
		// `setOptions` is the reactive write: a helper that replaced `options.data` without
		// going through it would leave the rendered rows on the old array.
		const table = makeTable()

		table.appendData([{ id: 3, name: 'Carol' }])

		expect(table.getRowModel().rows.map((row: { original: Row }) => row.original.name)).toEqual([
			'Alice',
			'Bob',
			'Carol',
		])
	})
})
