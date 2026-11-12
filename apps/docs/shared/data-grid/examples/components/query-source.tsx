'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'
import { createGridSourceFactory, withQuery } from '@ez-kit/qc-react/data-grid'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'

import { useDataGridType } from 'shared/DataGrid'

const shadcn = withQuery(createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures }))
const HeroExample = lazy(async () => {
	const hero = await import('@ez-kit/data-grid-heroui')
	const kit = withQuery(
		createDataGrid({ components: hero.allComponents, cellTypes: hero.cellTypes, features: allDataGridFeatures }),
	)
	return { default: () => <ExampleRoot kit={kit} /> }
})
type User = { id: string; name: string }
type Criteria = { search: string; descending: boolean; limit: number }
type Page = { items: User[]; total: number; next: number | null }
const users: User[] = ['Ada', 'Barbara', 'Carol', 'Dorothy', 'Evelyn', 'Frances', 'Grace', 'Hedy', 'Ida'].map(
	(name) => ({ id: name, name }),
)
// A deterministic in-memory API; a real fetcher receives the same args and signal.
async function fetchUsers(args: Criteria & { offset: number }, { signal }: { signal: AbortSignal }): Promise<Page> {
	await new Promise<void>((resolve) => setTimeout(resolve, 150))
	signal.throwIfAborted()
	const rows = users.filter((row) => row.name.toLowerCase().includes(args.search.toLowerCase()))
	if (args.descending) rows.reverse()
	return {
		items: rows.slice(args.offset, args.offset + args.limit),
		total: rows.length,
		next: args.offset + args.limit < rows.length ? args.offset + args.limit : null,
	}
}
const source = createGridSourceFactory({
	list: {
		prepareArgs: ({ pagination, globalFilter, sorting }) => ({
			offset: pagination.pageIndex * pagination.pageSize,
			limit: pagination.pageSize,
			search: typeof globalFilter === 'string' ? globalFilter : '',
			descending: sorting[0]?.desc ?? false,
		}),
		getRows: (page: Page) => page.items,
		getRowCount: (page) => page.total,
	},
	infinite: {
		prepareArgs: ({ pageSize, globalFilter, sorting }) => ({
			limit: pageSize,
			search: typeof globalFilter === 'string' ? globalFilter : '',
			descending: sorting[0]?.desc ?? false,
		}),
		preparePageArgs: ({ args, pageParam }: { args: Criteria; pageParam: number }) => ({ ...args, offset: pageParam }),
		initialPageParam: 0,
		getRows: (page: Page) => page.items,
		getNextPageParam: (page) => page.next,
	},
})({ key: ['query-example-users'], getAll: fetchUsers, getInfinite: fetchUsers })
const columns = [{ accessorKey: 'name' as const, header: 'Name', cell: { type: 'text' as const } }]
function ConnectedExample({ kit }: { kit: typeof shadcn }) {
	const [mode, setMode] = useState<'pages' | 'infinite'>('pages')
	const table = kit.useDataGrid({
		dataSource: source,
		columns,
		getRowId: (row) => row.id,
		pagination: { mode, pageSize: 3, trigger: 'manual' },
		sorting: true,
		globalFiltering: true,
	})
	return (
		<>
			<label>
				Pagination mode{' '}
				<select
					value={mode}
					onChange={(event) => {
						setMode(event.target.value === 'infinite' ? 'infinite' : 'pages')
					}}
				>
					<option value='pages'>Pages</option>
					<option value='infinite'>Infinite</option>
				</select>
			</label>
			<kit.DataGrid table={table} />
		</>
	)
}
function ExampleRoot({ kit }: { kit: typeof shadcn }) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
	return (
		<QueryClientProvider client={client}>
			<ConnectedExample kit={kit} />
		</QueryClientProvider>
	)
}
export function QuerySourceExample() {
	const { type } = useDataGridType()
	return (
		<Suspense fallback={<p>Loading example…</p>}>
			{type === 'heroui' ? <HeroExample /> : <ExampleRoot kit={shadcn} />}
		</Suspense>
	)
}
