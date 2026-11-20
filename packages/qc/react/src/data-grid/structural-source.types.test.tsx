import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { useCollectionQuery } from '@ez-kit/query-react/collection'
import { queryOptions } from '@tanstack/react-query'
import { expectTypeOf, it } from 'vitest'

import { createGridDataSource, createGridSourceFactory, createGridSourceFromCollection, withQuery } from './index'

import type { GridDataSource } from './index'

type User = { id: string }
const read = () => queryOptions({ queryKey: ['users'], queryFn: () => Promise.resolve({ users: [{ id: '1' }] }) })
const project = (data: { users: User[] }) => data.users
const wrong = (data: { items: User[] }) => data.items
const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))

function useSources() {
	const columns = [{ accessorKey: 'id' as const }]
	const source = { getAll: { query: read, getRows: project } }
	const table = connected.useDataGrid({ columns, dataSource: source })
	expectTypeOf(table.getRowModel().rows[0]?.original).toEqualTypeOf<User | undefined>()
	const typed: GridDataSource<User> = source
	connected.useDataGrid<User>({ columns, dataSource: typed })
	// @ts-expect-error an empty source cannot read
	connected.useDataGrid({ columns, dataSource: {} })
	// @ts-expect-error a query descriptor must return TanStack options
	connected.useDataGrid({ columns, dataSource: { getAll: { query: () => 42, getRows: project } } })
	// @ts-expect-error the projection has to accept the selected data
	connected.useDataGrid({ columns, dataSource: { getAll: { query: read, getRows: wrong } } })
	// @ts-expect-error the declared pagination mode needs a corresponding read
	connected.useDataGrid({ columns, dataSource: source, pagination: { mode: 'infinite' } })
	// @ts-expect-error the grid owns the observer notifications it needs
	connected.useDataGrid({ columns, dataSource: source, queryOptions: { notifyOnChangeProps: ['data'] } })

	const invalidation: [] = []
	const goodCollection = { invalidation, getAll: { query: read, getItems: project } }
	const badCollection = { invalidation, getAll: { query: read, getItems: wrong } }
	useCollectionQuery({ source: goodCollection, mode: 'pages', params: undefined })
	// @ts-expect-error getItems must accept query's data
	useCollectionQuery({ source: badCollection, mode: 'pages', params: undefined })
	// @ts-expect-error an adapter cannot validate an incompatible read
	createGridSourceFromCollection(badCollection, { params: () => undefined })
	const validGrid = createGridSourceFromCollection(goodCollection, { params: () => undefined })
	connected.useDataGrid({ columns, dataSource: validGrid })

	const child = (
		<connected.DataGrid
			columns={columns}
			dataSource={source}
		/>
	)
	const badProps = { columns, dataSource: { getAll: { query: read, getRows: wrong } } }
	// @ts-expect-error JSX checks the same structural source contract as the hook
	const badChild = <connected.DataGrid {...badProps} />
	return { child, badChild }
}

function useConditionalSelection(select?: (raw: { users: User[] }) => User[]) {
	const query = () => ({ ...read(), ...(select ? { select } : {}) })
	// @ts-expect-error the absence of select leaves the original response
	connected.useDataGrid({ columns: [], dataSource: { getAll: { query, getRows: (rows: User[]) => rows } } })
	createGridDataSource<{ users: User[] }, User, User[]>({
		invalidate: false,
		// @ts-expect-error a selected generic does not convert the response by itself
		getAll: { query: read, getRows: (rows) => rows },
	})
}

function useListFactory() {
	const make = createGridSourceFactory({ list: { prepareArgs: () => undefined, getRows: (rows: User[]) => rows } })
	const dataSource = make({ key: ['users'], getAll: () => Promise.resolve<User[]>([]) })
	// @ts-expect-error a list-only factory result has no infinite read
	connected.useDataGrid({ columns: [], dataSource, pagination: { mode: 'infinite' } })
}

function createSources() {
	const fetcher = () => Promise.resolve<User[]>([])
	const make = createGridSourceFactory({ list: { prepareArgs: () => undefined, getRows: (data: User[]) => data } })
	// @ts-expect-error the factory has no cursor defaults to inherit
	make({ key: ['users'], getAll: fetcher, getInfinite: fetcher })
	make({
		key: ['users'],
		getAll: fetcher,
		getInfinite: {
			fetcher,
			prepareArgs: () => undefined,
			preparePageArgs: () => undefined,
			getRows: (data) => data,
			initialPageParam: 0,
			getNextPageParam: () => undefined,
		},
	})
}

it('checks structural sources and cursor defaults at the public entry points', () => {
	expectTypeOf(useSources).toBeFunction()
	expectTypeOf(createSources).toBeFunction()
	expectTypeOf(useConditionalSelection).toBeFunction()
	expectTypeOf(useListFactory).toBeFunction()
})
