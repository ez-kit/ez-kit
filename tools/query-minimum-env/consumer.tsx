import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createGridSourceFromCollection, withQuery } from '@ez-kit/qc-react/data-grid'
import { InfiniteQuery, Mutation, Query } from '@ez-kit/query-react'
import { createCollectionSource, useCollectionQuery } from '@ez-kit/query-react/collection'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

const source = createCollectionSource({
	key: ['minimum'],
	getAll: {
		prepareArgs: (offset: number) => offset,
		fetcher: (offset: number) => Promise.resolve({ items: [{ id: offset }], total: 10 }),
		getItems: (data) => data.items,
		getTotal: (data) => data.total,
	},
	getInfinite: {
		prepareArgs: (search: string) => search,
		preparePageArgs: ({ args, pageParam }) => ({ search: args, cursor: pageParam }),
		fetcher: ({ cursor }: { search: string; cursor: number }) =>
			Promise.resolve({ items: [{ id: cursor }], next: cursor + 1 }),
		initialPageParam: 0,
		getNextPageParam: (page) => page.next,
		getItems: (page) => page.items,
	},
	update: { prepareArgs: (id: number) => id, fetcher: (id: number) => Promise.resolve(id) },
})
const gridSource = createGridSourceFromCollection(source, {
	params: (params) => params.pagination.pageIndex,
	infiniteParams: (params) => String(params.globalFilter ?? ''),
	update: ({ row }) => {
		if (!row) throw new Error('Missing row')
		return row.id
	},
})
const grid = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))

// This fixture consumes built declarations with native hooks at the minimum peer version.
export function useMinimumConsumer() {
	const list = useQuery(source.queries.list(0))
	const infinite = useInfiniteQuery(source.queries.infinite(''))
	const collection = useCollectionQuery({ source, mode: 'pages', params: 0, queryOptions: { enabled: true } })
	const table = grid.useDataGrid({ dataSource: gridSource, columns: [{ accessorKey: 'id' }] })
	const row: { id: number } | undefined = list.data?.items[0]
	const nextRow: { id: number } | undefined = infinite.data?.pages[0]?.items[0]
	const mutation: (id: number) => Promise<number> = collection.update.mutateAsync
	return { row, nextRow, mutation, table }
}

export function MinimumGates() {
	return (
		<>
			<Query query={source.queries.list(0)}>{(data) => data.total}</Query>
			<InfiniteQuery query={source.queries.infinite('')}>{(data) => data.pages.length}</InfiniteQuery>
			<Mutation mutation={source.update.mutation}>{(mutation) => String(mutation.isPending)}</Mutation>
		</>
	)
}
