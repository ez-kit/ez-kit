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
	const typed = source satisfies GridDataSource<User>
	connected.useDataGrid({ columns, dataSource: typed })
	// @ts-expect-error passing only User would erase the source response and capabilities
	connected.useDataGrid<User>({ columns, dataSource: { getAll: { query: read, getRows: wrong } } })
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

function useConditionalSources(flag: boolean, mode: 'pages' | 'infinite') {
	const fetcher = () => Promise.resolve({ users: [] as User[] })
	const good = { queryKey: ['valid'], queryFn: fetcher, select: project }
	const bad = { queryKey: ['invalid'], queryFn: fetcher, select: wrong }
	const query = () => (flag ? good : bad)
	const items = (rows: User[]) => rows
	const invalidation: [] = []
	const getAll = { query: read, getRows: project }
	const getInfinite = {
		query: () => ({ queryKey: ['infinite'], queryFn: fetcher, initialPageParam: 0, getNextPageParam: () => undefined }),
		getRows: project,
	}
	const invalid = { invalidation, getAll: { query, getItems: items } }
	// @ts-expect-error every branch of the option union must accept its raw response
	useCollectionQuery({ source: invalid, mode: 'pages', params: undefined })
	// @ts-expect-error a valid branch cannot cover the invalid branch
	connected.useDataGrid({ columns: [], dataSource: { getAll: { query, getRows: items } } })
	const maybeInfinite = { getAll, ...(flag ? { getInfinite } : {}) }
	const maybePages = { getInfinite, ...(flag ? { getAll } : {}) }
	connected.useDataGrid({ columns: [], dataSource: maybeInfinite })
	// @ts-expect-error explicit infinite mode requires a guaranteed infinite read
	connected.useDataGrid({ columns: [], dataSource: maybeInfinite, pagination: { mode: 'infinite' } })
	// @ts-expect-error explicit pages mode requires a guaranteed page read
	connected.useDataGrid({ columns: [], dataSource: maybePages, pagination: { mode: 'pages' } })
	// @ts-expect-error a dynamic mode requires both reads
	connected.useDataGrid({ columns: [], dataSource: { getAll }, pagination: { mode } })
	connected.useDataGrid({ columns: [], dataSource: { getAll, getInfinite }, pagination: { mode } })

	const collection = {
		invalidation,
		getAll: flag
			? { query: read, getItems: project }
			: {
					query: () => ({ queryKey: ['items'], queryFn: () => Promise.resolve({ items: [] as User[] }) }),
					getItems: wrong,
				},
	}
	connected.useDataGrid({
		columns: [],
		dataSource: createGridSourceFromCollection(collection, { params: () => undefined }),
	})
}

it('checks all read variants while preserving correlated collection descriptors', () => {
	expectTypeOf(useConditionalSources).toBeFunction()
})
