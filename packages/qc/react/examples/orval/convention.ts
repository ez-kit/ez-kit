import { createGridSourceFactory } from '../../src/data-grid'

import type { GridInfiniteParams, GridQueryParams } from '../../src/data-grid'

type Page<Row> = { items: Row[]; total: number }
type Feed<Row> = { items: Row[]; next?: string }
function criteria({ globalFilter, sorting }: GridInfiniteParams | GridQueryParams) {
	return {
		search: typeof globalFilter === 'string' ? globalFilter : '',
		sort: sorting.map(({ id, desc }) => `${id}:${desc ? 'desc' : 'asc'}`).join(','),
	}
}
// Define this convention once for endpoints sharing these envelopes and parameters.
export function makeSource<Row extends { id: string }>() {
	return createGridSourceFactory({
		list: {
			prepareArgs: (params) => ({
				...criteria(params),
				offset: params.pagination.pageIndex * params.pagination.pageSize,
				limit: params.pagination.pageSize,
			}),
			getRows: (response: Page<Row>) => response.items,
			getRowCount: (response) => response.total,
		},
		infinite: {
			prepareArgs: (params) => ({ ...criteria(params), limit: params.pageSize }),
			preparePageArgs: ({
				args,
				pageParam,
			}: {
				args: { search: string; sort: string; limit: number }
				pageParam: string | undefined
			}) => ({ ...args, ...(pageParam === undefined ? {} : { cursor: pageParam }) }),
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (page: Feed<Row>) => page.next,
			getRows: (page) => page.items,
		},
		mutations: {
			update: {
				prepareArgs: ({ row, values }) => {
					if (!row) throw new Error('The edited row is no longer available')
					return { id: row.id, body: values }
				},
			},
			delete: { prepareArgs: ({ row }) => row.id },
			deleteMany: { prepareArgs: ({ rows }) => ({ ids: rows.map((row) => row.id) }) },
		},
	})
}
