'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createDataGridSource, withQuery } from '@ez-kit/qc-react/data-grid'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { allComponents, cellTypes } from 'shared/GridKit'

const defaultKit = withQuery(createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures }))
type User = { id: string; name: string }
type Criteria = { search: string; limit: number }
type Page = { items: User[]; total: number; nextCursor: number | null }
const users = ['Ada', 'Barbara', 'Carol', 'Dorothy', 'Evelyn', 'Frances', 'Grace', 'Hedy', 'Ida'].map((name) => ({
	id: name,
	name,
}))

async function fetchUsers(args: Criteria & { offset: number }, { signal }: { signal: AbortSignal }): Promise<Page> {
	await new Promise<void>((resolve) => setTimeout(resolve, 400))
	signal.throwIfAborted()
	const matches = users.filter((user) => user.name.toLowerCase().includes(args.search.toLowerCase()))
	const end = args.offset + args.limit
	return {
		items: matches.slice(args.offset, end),
		total: matches.length,
		nextCursor: end < matches.length ? end : null,
	}
}
const source = createDataGridSource({
	key: ['pagination-users-demo'],
	read: {
		fetcher: fetchUsers,
		prepareArgs: (input) => ({
			offset: input.mode === 'infinite' ? input.pageParam : input.pageIndex * input.pageSize,
			limit: input.pageSize,
			search: typeof input.params.globalFilter === 'string' ? input.params.globalFilter : '',
		}),
		getItems: (page) => page.items,
		getTotal: (page) => page.total,
		infinite: {
			initialPageParam: 0,
			getNextPageParam: (page) => page.nextCursor,
		},
	},
})

function Example({ kit, mode }: { kit: typeof defaultKit; mode: 'pages' | 'infinite' }) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
	return (
		<QueryClientProvider client={client}>
			<kit.DataGrid
				dataSource={source}
				columns={[{ accessorKey: 'name', header: 'Name', cell: { type: 'text' } }]}
				getRowId={(user) => user.id}
				globalFiltering
				pagination={{ mode, pageSize: 3, trigger: 'manual' }}
			/>
		</QueryClientProvider>
	)
}
export function QueryPagesExample({ kit = defaultKit }: { kit?: typeof defaultKit } = {}) {
	return (
		<Example
			kit={kit}
			mode='pages'
		/>
	)
}
export function QueryInfiniteExample({ kit = defaultKit }: { kit?: typeof defaultKit } = {}) {
	return (
		<Example
			kit={kit}
			mode='infinite'
		/>
	)
}
