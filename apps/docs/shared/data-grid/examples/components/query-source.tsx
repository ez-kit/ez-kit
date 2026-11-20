'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createGridSourceFactory, withQuery } from '@ez-kit/qc-react/data-grid'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { allComponents, cellTypes } from 'shared/GridKit'

const defaultKit = withQuery(createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures }))
type User = { id: string; name: string }
type Criteria = { search: string; sorted: boolean; descending: boolean; limit: number }
type Page = { items: User[]; total: number; next: number | null }
function createDemoSource() {
	let users: User[] = ['Ada', 'Barbara', 'Carol', 'Dorothy', 'Evelyn', 'Frances', 'Grace', 'Hedy', 'Ida'].map(
		(name) => ({ id: name, name }),
	)
	let nextId = 0
	const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 350))
	const prepareName = (value: string | undefined) => {
		if (!value?.trim()) throw new Error('Name is required')
		return value.trim()
	}
	// A deterministic in-memory API; a real fetcher receives the same args and signal.
	async function fetchUsers(args: Criteria & { offset: number }, { signal }: { signal: AbortSignal }): Promise<Page> {
		await new Promise<void>((resolve) => setTimeout(resolve, 150))
		signal.throwIfAborted()
		const rows = users.filter((row) => row.name.toLowerCase().includes(args.search.toLowerCase()))
		if (args.sorted) rows.sort((a, b) => a.name.localeCompare(b.name) * (args.descending ? -1 : 1))
		return {
			items: rows.slice(args.offset, args.offset + args.limit),
			total: rows.length,
			next: args.offset + args.limit < rows.length ? args.offset + args.limit : null,
		}
	}
	return createGridSourceFactory({
		list: {
			prepareArgs: ({ pagination, globalFilter, sorting }) => ({
				offset: pagination.pageIndex * pagination.pageSize,
				limit: pagination.pageSize,
				search: typeof globalFilter === 'string' ? globalFilter : '',
				sorted: sorting.length > 0,
				descending: sorting[0]?.desc ?? false,
			}),
			getRows: (page: Page) => page.items,
			getRowCount: (page) => page.total,
		},
		infinite: {
			prepareArgs: ({ pageSize, globalFilter, sorting }) => ({
				limit: pageSize,
				search: typeof globalFilter === 'string' ? globalFilter : '',
				sorted: sorting.length > 0,
				descending: sorting[0]?.desc ?? false,
			}),
			preparePageArgs: ({ args, pageParam }: { args: Criteria; pageParam: number }) => ({ ...args, offset: pageParam }),
			initialPageParam: 0,
			getRows: (page: Page) => page.items,
			getNextPageParam: (page) => page.next,
		},
	})({
		key: ['query-example-users'],
		getAll: fetchUsers,
		getInfinite: fetchUsers,
		create: {
			prepareArgs: ({ values }) => prepareName(values.name),
			fetcher: async (name: string) => {
				await delay()
				const user = { id: `created-${String(++nextId)}`, name }
				users = [user, ...users]
				return user
			},
		},
		update: {
			prepareArgs: ({ row, values }) => {
				if (!row) throw new Error('User is no longer available')
				return { id: row.id, name: prepareName(values.name) }
			},
			fetcher: async (user: User) => {
				await delay()
				users = users.map((row) => (row.id === user.id ? user : row))
				return user
			},
		},
		delete: {
			prepareArgs: ({ row }) => row.id,
			fetcher: async (id: string) => {
				await delay()
				users = users.filter((row) => row.id !== id)
			},
		},
		deleteMany: {
			prepareArgs: ({ rows }) => rows.map((row) => row.id),
			fetcher: async (ids: string[]) => {
				await delay()
				users = users.filter((row) => !ids.includes(row.id))
			},
		},
	})
}
const columns = [{ accessorKey: 'name' as const, header: 'Name', cell: { type: 'text' as const } }]
function ConnectedExample({ kit }: { kit: typeof defaultKit }) {
	const [source] = useState(createDemoSource)
	const [mode, setMode] = useState<'pages' | 'infinite'>('pages')
	const table = kit.useDataGrid({
		dataSource: source,
		columns,
		getRowId: (row) => row.id,
		pagination: { mode, pageSize: 3, trigger: 'manual' },
		sorting: true,
		globalFiltering: true,
		selection: true,
		creating: { mode: 'modal' },
		editing: { mode: 'modal' },
		deleting: { bulk: true },
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
function ExampleRoot({ kit }: { kit: typeof defaultKit }) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
	return (
		<QueryClientProvider client={client}>
			<ConnectedExample kit={kit} />
		</QueryClientProvider>
	)
}
export function QuerySourceExample({ kit = defaultKit }: { kit?: typeof defaultKit } = {}) {
	return <ExampleRoot kit={kit} />
}
