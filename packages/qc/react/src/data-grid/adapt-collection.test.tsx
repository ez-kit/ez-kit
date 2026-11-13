import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { createCollectionSource } from '@ez-kit/query-react/collection'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { adaptCollectionToGrid } from './adapt-collection'
import { withQuery } from './with-query'

import type { ReactNode } from 'react'

const source = createCollectionSource({
	key: ['users'],
	getAll: {
		prepareArgs: (params: { team: string; offset: number }) => params,
		fetcher: (_args: { team: string; offset: number }) =>
			Promise.resolve({ items: [{ id: 42, name: 'Ada' }], total: 1 }),
		getItems: (page) => page.items,
		getTotal: (page) => page.total,
	},
	update: {
		prepareArgs: (input: { id: number; name: string }) => ({ path: input.id, body: input.name }),
		fetcher: (args: { path: number; body: string }) => Promise.resolve({ id: args.path, name: args.body }),
	},
	deleteMany: {
		prepareArgs: (input: number[]) => ({ ids: input }),
		fetcher: (args: { ids: number[] }) => Promise.resolve(args.ids.length),
	},
})
const adapted = adaptCollectionToGrid(source, {
	params: ({ pagination }) => ({ team: 'one', offset: pagination.pageIndex * pagination.pageSize }),
	update: ({ row, values }) => {
		if (!row) throw new Error('missing')
		return { id: row.id, name: values.name ?? row.name }
	},
	deleteMany: ({ rows }) => rows.map((row) => row.id),
})
describe('collection grid mapping', () => {
	it('preserves cache identity and projects rows', () => {
		const params = {
			pagination: { pageIndex: 2, pageSize: 10 },
			sorting: [],
			columnFilters: [],
			globalFilter: undefined,
		}
		expect(adapted.getAll?.query(params)).toMatchObject({ queryKey: ['users', 'list', { team: 'one', offset: 20 }] })
		expect(adapted.invalidation).toBe(source.invalidation)
	})
	it('maps original entities rather than using grid row IDs as API IDs', () => {
		expect(
			adapted.update.prepareArgs({ rowId: 'grid:42', row: { id: 42, name: 'Ada' }, values: { name: 'Grace' } }),
		).toEqual({ id: 42, name: 'Grace' })
		expect(adapted.deleteMany.prepareArgs({ rowIds: ['grid:42'], rows: [{ id: 42, name: 'Ada' }] })).toEqual([42])
		expectTypeOf(adapted.update.prepareArgs).returns.toEqualTypeOf<{ id: number; name: string }>()
	})
})
function InvalidMapping() {
	// @ts-expect-error source operations need compatible grid input mappings
	adaptCollectionToGrid(source, { params: () => ({ team: 'one', offset: 0 }) })
}
void InvalidMapping

it('renders an infinite-only collection through the connected grid hook', async () => {
	const { client, wrapper } = makeHarness()
	const infiniteSource = createCollectionSource({
		key: ['adapted-feed'],
		getInfinite: {
			prepareArgs: (params: { limit: number }) => params,
			preparePageArgs: ({ args, pageParam }) => ({ ...args, cursor: pageParam }),
			initialPageParam: 0,
			getNextPageParam: () => undefined,
			fetcher: (_args: { limit: number; cursor: number }) => Promise.resolve({ items: [{ id: 7, name: 'Seven' }] }),
			getItems: (page) => page.items,
		},
	})
	const dataSource = adaptCollectionToGrid(infiniteSource, { infiniteParams: ({ pageSize }) => ({ limit: pageSize }) })
	const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
	const { result, unmount } = renderHook(
		() => connected.useDataGrid({ dataSource, columns: [{ accessorKey: 'name' }], pagination: { mode: 'infinite' } }),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows[0]?.original.name).toBe('Seven')
	})
	expectTypeOf(result.current.options.data[0]).toEqualTypeOf<{ id: number; name: string } | undefined>()
	unmount()
	client.clear()
})
function makeHarness() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return {
		client,
		wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	}
}
