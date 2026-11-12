import { infiniteQueryOptions, queryOptions, QueryClient, QueryObserver } from '@tanstack/react-query'
import { expect, expectTypeOf, it } from 'vitest'

import { createGridDataSource } from './index'

import type { GridQueryParams } from './types'

const params: GridQueryParams = {
	pagination: { pageIndex: 0, pageSize: 20 },
	sorting: [],
	columnFilters: [],
	globalFilter: '',
}

type User = { id: string; name: string }

it('retains native keys, selected rows and explicit invalidation scope', async () => {
	const source = createGridDataSource({
		getAll: {
			query: () =>
				queryOptions({
					queryKey: ['external-users'],
					queryFn: () => Promise.resolve({ items: [{ id: '1', name: 'Ada' }], count: 1 }),
					select: (response) => response.items,
				}),
			getRows: (rows: User[]) => rows,
			getRowCount: (rows) => rows.length,
		},
		invalidate: { additional: [{ queryKey: ['external-users'] }] },
	})
	expectTypeOf(source.getAll.getRows).returns.toEqualTypeOf<readonly User[]>()
	expect(source.queries.list(params).queryKey).toEqual(['external-users'])
	expect(source.invalidation).toEqual([{ queryKey: ['external-users'] }])
	const client = new QueryClient()
	// Native cache stores the original response, independently of observer select.
	const observer = new QueryObserver(client, source.queries.list(params))
	await observer.refetch()
	expect(observer.getCurrentResult().data).toEqual([{ id: '1', name: 'Ada' }])
	observer.destroy()
	expect(client.getQueryData(['external-users'])).toEqual({ items: [{ id: '1', name: 'Ada' }], count: 1 })
	client.clear()
})

function missingInvalidationPolicy() {
	// @ts-expect-error External query keys need an explicit invalidation decision, including false.
	createGridDataSource({
		getAll: {
			query: () => queryOptions({ queryKey: ['external'], queryFn: () => Promise.resolve([] as User[]) }),
			getRows: (rows: User[]) => rows,
		},
	})
}
void missingInvalidationPolicy

it('preserves independently owned infinite keys without appending generated segments', () => {
	const list = () => queryOptions({ queryKey: ['external', 'paged'], queryFn: () => Promise.resolve([] as User[]) })
	const infinite = () =>
		infiniteQueryOptions({
			queryKey: ['external', 'cursor-feed'],
			queryFn: ({ pageParam }) => {
				expectTypeOf(pageParam).toEqualTypeOf<string | null>()
				return Promise.resolve([] as User[])
			},
			initialPageParam: null as string | null,
			getNextPageParam: () => null,
		})
	const source = createGridDataSource({
		getAll: { query: list, getRows: (rows: User[]) => rows },
		getInfinite: { query: infinite, getRows: (rows: User[]) => rows },
		invalidate: false,
	})
	expect(source.queries.list(params).queryKey).toEqual(['external', 'paged'])
	expect(
		source.queries.infinite?.({ pageSize: 20, sorting: [], columnFilters: [], globalFilter: '' }).queryKey,
	).toEqual(['external', 'cursor-feed'])
	expect(source.invalidation).toEqual([])
})
