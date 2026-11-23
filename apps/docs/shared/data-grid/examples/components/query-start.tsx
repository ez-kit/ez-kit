'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createDataGridSource, withQuery } from '@ez-kit/qc-react/data-grid'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { allComponents, cellTypes } from 'shared/GridKit'

type User = { id: string; name: string }
type UsersResponse = { items: User[]; total: number }

const users = ['Ada', 'Barbara', 'Grace'].map((name) => ({ id: name, name }))

// Replace this function with the request to your API.
async function fetchUsers(_: undefined, { signal }: { signal: AbortSignal }): Promise<UsersResponse> {
	await new Promise<void>((resolve) => setTimeout(resolve, 350))
	signal.throwIfAborted()
	return { items: users, total: users.length }
}

const dataSource = createDataGridSource({
	key: ['users'],
	read: {
		fetcher: fetchUsers,
		prepareArgs: () => undefined,
		getItems: (response) => response.items,
	},
})

const gridBundle = createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures })
const defaultKit = withQuery(gridBundle)
const columns = gridBundle.createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

export function QueryStartExample({ kit = defaultKit }: { kit?: typeof defaultKit } = {}) {
	const [client] = useState(() => new QueryClient())

	return (
		<QueryClientProvider client={client}>
			<kit.DataGrid
				columns={columns}
				dataSource={dataSource}
				getRowId={(user) => user.id}
				pagination={false}
			/>
		</QueryClientProvider>
	)
}
