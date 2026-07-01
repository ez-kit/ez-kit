import { describe, expect, it } from 'vitest'

import { createTable, defineColumns } from '../../index'

type Row = { id: number; name: string }

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = defineColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

describe('InfiniteFeature — state (100% grid-owned)', () => {
	it('seeds state.infinite with fetching flags false and error null', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getSnapshot().infinite).toEqual({
			isFetchingNextPage: false,
			isFetchingPreviousPage: false,
			error: null,
		})
	})

	it('does not hold hasNextPage in state (it is a pagination option, not state)', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { mode: 'infinite', hasNextPage: true },
		})
		expect('hasNextPage' in table.getSnapshot().infinite).toBe(false)
	})
})

describe('InfiniteFeature — setInfiniteStatus', () => {
	it('merges partial updates without clobbering other fields', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		table.setInfiniteStatus({ isFetchingNextPage: true })
		expect(table.getSnapshot().infinite.isFetchingNextPage).toBe(true)
		expect(table.getSnapshot().infinite.error).toBeNull()

		table.setInfiniteStatus({ error: { direction: 'forward', error: new Error('boom') } })
		expect(table.getSnapshot().infinite.isFetchingNextPage).toBe(true)
		expect((table.getSnapshot().infinite.error?.error as Error).message).toBe('boom')
	})
})

describe('appendData / prependData — immutability', () => {
	it('appendData builds a new array after current data, leaving the previous untouched', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		const prev = table.options.data
		table.appendData([{ id: 3, name: 'Carol' }])
		expect(table.options.data).not.toBe(prev)
		expect(prev).toHaveLength(2)
		expect(table.options.data.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Carol'])
	})

	it('prependData inserts before current data immutably', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		table.prependData([{ id: 0, name: 'Zero' }])
		expect(table.options.data.map((r) => r.name)).toEqual(['Zero', 'Alice', 'Bob'])
	})
})

describe('loading — controlled state (no bespoke prop, no imperative setter)', () => {
	it('defaults to isPending false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getSnapshot().loading.isPending).toBe(false)
	})

	it('initialState seeds the loading state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})
		expect(table.getSnapshot().loading.isPending).toBe(true)
	})

	it('table has no setLoading method', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		// @ts-expect-error setLoading is removed — state.loading is fed via the controlled prop only
		expect(table.setLoading).toBeUndefined()
	})
})
