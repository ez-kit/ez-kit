'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { withQuery } from '../../src/data-grid'

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
