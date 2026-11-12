'use client'

import { createDataGrid, useDataGridState } from '@ez-kit/data-grid-react'
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
	return { default: () => <ConnectedExample kit={kit} /> }
})
type User = { id: string; name: string }
const makeSource = createGridSourceFactory({
	list: { prepareArgs: (params) => params, getRows: (rows: User[]) => rows },
})
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
function Status() {
	const loading = useDataGridState((state) => state.loading)
	return (
		<p role='status'>
			{loading.isFetching
				? 'Refreshing users…'
				: loading.isError
					? 'Refresh failed; saved changes remain on the server.'
					: 'Users loaded.'}
		</p>
	)
}
// An isolated in-memory API per example; Query owns the client-facing data.
function createDemoApi() {
	let rows: User[] = [{ id: '1', name: 'Ada' }]
	let saved = false
	let failRefresh = false
	const source = makeSource({
		key: ['modal-users'],
		getAll: async () => {
			if (saved) {
				await delay(4000)
				if (failRefresh) throw new Error('Refresh failed')
			}
			return [...rows]
		},
		update: {
			prepareArgs: ({ row, values }) => ({ id: row?.id, name: String(values.name) }),
			fetcher: async ({ id, name }: { id: string | undefined; name: string }) => {
				await delay(1500)
				rows = rows.map((row) => (row.id === id ? { ...row, name } : row))
				saved = true
			},
		},
	})
	return {
		source,
		setFailRefresh(value: boolean) {
			failRefresh = value
		},
	}
}
function ConnectedExample({ kit }: { kit: typeof shadcn }) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
	const [failRefresh, setFailRefresh] = useState(false)
	const [api] = useState(createDemoApi)
	return (
		<QueryClientProvider client={client}>
			<p>
				Save takes 1.5 seconds; refreshing the list takes 4 seconds. Close the dialog during save to let it finish in
				the background.
			</p>
			<label>
				<input
					type='checkbox'
					checked={failRefresh}
					onChange={(event) => {
						setFailRefresh(event.target.checked)
						api.setFailRefresh(event.target.checked)
					}}
				/>{' '}
				Fail the next refresh
			</label>
			<kit.DataGrid
				dataSource={api.source}
				columns={[{ accessorKey: 'name', header: 'Name', cell: { type: 'text' } }]}
				getRowId={(row) => row.id}
				editing={{ mode: 'modal' }}
			>
				<Status />
				<kit.DataGrid.Table />
			</kit.DataGrid>
		</QueryClientProvider>
	)
}
export function QueryModalExample() {
	const { type } = useDataGridType()
	return (
		<Suspense fallback={<p>Loading example…</p>}>
			{type === 'heroui' ? <HeroExample /> : <ConnectedExample kit={shadcn} />}
		</Suspense>
	)
}
