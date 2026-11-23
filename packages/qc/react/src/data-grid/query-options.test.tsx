import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { fixtureSource } from './testing/grid-source.fixture'
import { createGridDataSource } from './testing/source.fixture'

import { withQuery } from './index'

import type { PropsWithChildren } from 'react'

const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))

it.each(['pages', 'infinite'] as const)(
	'%s: overrides consumer policy without replacing source identity',
	async (mode) => {
		const client = new QueryClient()
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		)
		const fetcher = vi.fn(() => Promise.resolve([{ id: '1', name: 'Ada' }]))
		const source = createGridDataSource({
			invalidate: false,
			getAll: {
				query: () => ({ queryKey: ['policy', 'pages'], queryFn: fetcher, enabled: false, staleTime: 0 }),
				getRows: (rows: { id: string; name: string }[]) => rows,
			},
			getInfinite: {
				query: () => ({
					queryKey: ['policy', 'infinite'],
					queryFn: fetcher,
					enabled: false,
					staleTime: 0,
					initialPageParam: 0,
					getNextPageParam: () => undefined,
				}),
				getRows: (rows: { id: string; name: string }[]) => rows,
			},
		})
		const hostile = {
			queryKey: ['replacement'],
			queryFn: () => Promise.reject(new Error('wrong fetcher')),
			select: () => [],
		}
		const { result, rerender, unmount } = renderHook(
			({ enabled }) =>
				connected.useDataGrid({
					dataSource: fixtureSource(source),
					columns: [{ accessorKey: 'name' }],
					pagination: mode === 'infinite' ? { mode: 'infinite' } : true,
					queryOptions: { ...hostile, enabled, staleTime: Infinity, retry: false },
				}),
			{ wrapper, initialProps: { enabled: false } },
		)
		expect(fetcher).not.toHaveBeenCalled()
		rerender({ enabled: true })
		await waitFor(() => {
			expect(result.current.getRowModel().rows[0]?.original.name).toBe('Ada')
		})
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(
			client
				.getQueryCache()
				.find({ queryKey: ['policy', mode] })
				?.isStale(),
		).toBe(false)
		expect(client.getQueryCache().find({ queryKey: ['replacement'] })).toBeUndefined()
		unmount()
		client.clear()
	},
)

it('cannot load another cached page while disabled', async () => {
	const client = new QueryClient()
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const rows = [{ id: '1' }]
	const queryKey = ['disabled-load-more']
	client.setQueryData(queryKey, { pages: [rows], pageParams: [0] })
	const queryFn = vi.fn(() => Promise.resolve(rows))
	const source = {
		getInfinite: {
			query: () => ({ queryKey, queryFn, initialPageParam: 0, getNextPageParam: () => 1 }),
			getRows: (page: typeof rows) => page,
		},
	}
	const h = renderHook(
		() =>
			connected.useDataGrid({
				dataSource: fixtureSource(source),
				columns: [{ accessorKey: 'id' }],
				pagination: { mode: 'infinite' },
				queryOptions: { enabled: false },
			}),
		{ wrapper },
	)
	const infinite = h.result.current.grid.pagination.infinite
	expect(infinite?.hasNextPage).toBe(false)
	await infinite?.onLoadMore?.({ direction: 'forward' })
	expect(queryFn).not.toHaveBeenCalled()
	h.unmount()
	client.clear()
})

it('publishes loading and errors even when native notification policy only watches data', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, notifyOnChangeProps: ['data'] } } })
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	type Row = { id: string }
	const error = new Error('Failed without data')
	const source = {
		getAll: {
			query: () => ({ queryKey: ['notify'], queryFn: () => Promise.reject<Row[]>(error) }),
			getRows: (data: Row[]) => data,
		},
	}
	const h = renderHook(
		() => connected.useDataGrid({ dataSource: fixtureSource(source), columns: [{ accessorKey: 'id' }] }),
		{
			wrapper,
		},
	)
	await waitFor(() => {
		expect(h.result.current.store.state.loading.error).toBe(error)
	})
	h.unmount()
	client.clear()
})
