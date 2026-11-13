'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'
import { useCollectionQuery } from '@ez-kit/query-react/collection'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { withQuery } from '../../src/data-grid'

import { usersCollection, collectionGridSource } from './collection'
import { usersSource } from './source'

const { DataGrid, useDataGrid } = withQuery(
	createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures }),
)
const columns = [{ accessorKey: 'name' as const, header: 'Name', cell: { type: 'text' as const } }]
export function ComponentEntry() {
	return (
		<DataGrid
			dataSource={usersSource}
			columns={columns}
			editing={true}
			creating={true}
			deleting={{ bulk: true }}
			selection={true}
			pagination={{ pageSize: 20 }}
			sorting={true}
			globalFiltering={true}
		/>
	)
}
export function HookEntry() {
	const table = useDataGrid({
		dataSource: usersSource,
		columns,
		editing: true,
		pagination: { mode: 'infinite', pageSize: 20 },
		sorting: true,
		globalFiltering: true,
	})
	return <DataGrid table={table} />
}
export function Example({ entry = 'component' }: { entry?: 'component' | 'hook' }) {
	const [client] = useState(() => new QueryClient())
	return (
		<QueryClientProvider client={client}>
			{entry === 'component' ? <ComponentEntry /> : <HookEntry />}
		</QueryClientProvider>
	)
}

// Both examples run beneath the application's QueryClientProvider.
export function CollectionListEntry() {
	const users = useCollectionQuery({
		source: usersCollection,
		mode: 'pages',
		params: { offset: 0, limit: 20, search: '' },
	})
	return (
		<ul>
			{users.items.map((user) => (
				<li key={user.id}>{user.name}</li>
			))}
		</ul>
	)
}
export function CollectionGridEntry() {
	return (
		<DataGrid
			dataSource={collectionGridSource}
			columns={columns}
			editing
			creating
			deleting={{ bulk: true }}
			selection
			pagination={{ pageSize: 20 }}
			globalFiltering
		/>
	)
}
