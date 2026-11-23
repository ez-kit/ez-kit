'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createGridSourceFromCollection, withQuery } from '@ez-kit/qc-react/data-grid'
import { createCollectionSource, useCollectionQuery } from '@ez-kit/query-react/collection'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { allComponents, cellTypes } from 'shared/GridKit'

type User = { id: string; name: string }
type Params = { offset: number; limit: number }

const gridBundle = createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures })
const defaultKit = withQuery(gridBundle)
const columns = gridBundle.createColumns<User>([{ accessorKey: 'name', header: 'Name', cell: { type: 'text' } }])
const pageSize = 3

function createUsersSource() {
	let users: User[] = ['Ada', 'Barbara', 'Grace'].map((name) => ({ id: name, name }))
	return createCollectionSource({
		key: ['users'],
		getAll: {
			prepareArgs: (params: Params) => params,
			fetcher: ({ offset, limit }: Params) =>
				Promise.resolve({ items: users.slice(offset, offset + limit), total: users.length }),
			getItems: (response) => response.items,
			getTotal: (response) => response.total,
		},
		update: {
			prepareArgs: (input: User) => input,
			fetcher: async (updated: User) => {
				await new Promise<void>((resolve) => setTimeout(resolve, 350))
				users = users.map((user) => (user.id === updated.id ? updated : user))
				return updated
			},
		},
	})
}

function UsersList({ source }: { source: ReturnType<typeof createUsersSource> }) {
	const users = useCollectionQuery({ source, mode: 'pages', params: { offset: 0, limit: pageSize } })
	return (
		<section aria-label='Ordinary list'>
			<h3 className='font-medium'>Ordinary list</h3>
			{users.query.isPending && <p role='status'>Loading users…</p>}
			{users.query.error && <p role='alert'>{users.query.error.message}</p>}
			<ul className='list-inside list-disc'>
				{users.items.map((user) => (
					<li key={user.id}>{user.name}</li>
				))}
			</ul>
		</section>
	)
}

export function QuerySharedSourceExample({ kit = defaultKit }: { kit?: typeof defaultKit } = {}) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }))
	const [source] = useState(createUsersSource)
	const [dataSource] = useState(() =>
		createGridSourceFromCollection(source, {
			params: ({ pagination }) => ({
				offset: pagination.pageIndex * pagination.pageSize,
				limit: pagination.pageSize,
			}),
			update: ({ row, values }) => {
				if (!row) throw new Error('User is no longer available')
				const name = values.name?.trim()
				if (!name) throw new Error('Name is required')
				return { id: row.id, name }
			},
		}),
	)

	return (
		<QueryClientProvider client={client}>
			<div className='grid gap-4'>
				<section aria-label='Editable grid'>
					<h3 className='font-medium'>Editable grid</h3>
					<kit.DataGrid
						columns={columns}
						dataSource={dataSource}
						getRowId={(user) => user.id}
						pagination={{ mode: 'pages', pageSize }}
						editing={{ mode: 'modal' }}
					/>
				</section>
				<UsersList source={source} />
			</div>
		</QueryClientProvider>
	)
}
