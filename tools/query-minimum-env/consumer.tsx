import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createDataGridSource, withQuery } from '@ez-kit/qc-react/data-grid'
import { InfiniteQuery, Mutation, Query } from '@ez-kit/query-react'
import { useCollectionQuery } from '@ez-kit/query-react/collection'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

const source = createDataGridSource({
	key: ['minimum'],
	read: {
		prepareArgs: (input) => (input.mode === 'infinite' ? input.pageParam : input.pageIndex * input.pageSize),
		fetcher: (offset: number) => Promise.resolve({ items: [{ id: offset }], total: 10, next: offset + 1 }),
		getItems: (data) => data.items,
		getTotal: (data) => data.total,
		infinite: { initialPageParam: 0, getNextPageParam: (page) => page.next },
	},
	delete: { prepareArgs: ({ row }) => row.id, fetcher: (id: number) => Promise.resolve(id) },
})
const grid = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
const params = { sorting: [], columnFilters: [], globalFilter: undefined }
const pagination = { mode: 'pages', pageIndex: 0, pageSize: 1 } as const
const pages = source.read.pages.query({ ...pagination, params })
const infinite = source.read.infinite.query({ mode: 'infinite', pageSize: 1, params })

// This fixture consumes built declarations with native hooks at the minimum peer version.
export function useMinimumConsumer() {
	const list = useQuery(pages)
	const feed = useInfiniteQuery(infinite)
	const collection = useCollectionQuery({ source, pagination, params, queryOptions: { enabled: true } })
	const table = grid.useDataGrid({ dataSource: source, columns: [{ accessorKey: 'id' }] })
	const row: { id: number } | undefined = list.data?.items[0]
	const nextRow: { id: number } | undefined = feed.data?.pages[0]?.items[0]
	const mutation: (input: { rowId: string; row: { id: number } }) => Promise<number> = collection.delete.mutateAsync
	return { row, nextRow, mutation, table }
}

export function MinimumGates() {
	return (
		<>
			<Query query={pages}>{(data) => data.total}</Query>
			<InfiniteQuery query={infinite}>{(data) => data.pages.length}</InfiniteQuery>
			<Mutation mutation={source.delete.mutation}>{(mutation) => String(mutation.isPending)}</Mutation>
		</>
	)
}
