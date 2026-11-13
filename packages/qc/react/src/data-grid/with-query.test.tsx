import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, expectTypeOf, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

import type { GridQueryParams } from './index'
import type { PropsWithChildren } from 'react'

type User = { id: string; name: string }
const bundle = createDataGrid({ components: {}, features: allDataGridFeatures })
const connected = withQuery(bundle)
const columns = connected.createColumns<User>([{ accessorKey: 'name' }])
function harness() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return {
		client,
		wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
	}
}
const makeSource = createGridSourceFactory({
	list: {
		prepareArgs: (params) => params,
		getRows: (response: { items: User[]; total: number }) => response.items,
		getRowCount: (response) => response.total,
	},
})

it('keeps bundle helpers and compound members', () => {
	expect(connected.createColumns).toBe(bundle.createColumns)
	expect(connected.DataGrid.Table).toBe(bundle.DataGrid.Table)
	expect(connected.useGridContext).toBe(bundle.useGridContext)
})

it('connects applied table parameters and keeps the table stable', async () => {
	const { client, wrapper } = harness()
	const fetcher = vi.fn((params: { pagination: { pageIndex: number; pageSize: number }; globalFilter: unknown }) =>
		Promise.resolve({
			items: [{ id: String(params.pagination.pageIndex), name: String(params.globalFilter ?? 'Ada') }],
			total: 50,
		}),
	)
	const source = makeSource({ key: ['users'], getAll: fetcher })
	const { result, unmount } = renderHook(
		() =>
			connected.useDataGrid({
				dataSource: source,
				columns,
				pagination: { pageSize: 10 },
				globalFiltering: true,
				selection: true,
			}),
		{ wrapper },
	)
	const table = result.current
	expectTypeOf(table.options.data[0]).toEqualTypeOf<User | undefined>()
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('Ada')
	})
	expect(result.current).toBe(table)
	act(() => {
		table.setPageIndex(2)
	})
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.id).toBe('2')
	})
	act(() => {
		table.setGlobalFilter('Grace')
	})
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('Grace')
	})
	expect(table.store.state.pagination.pageIndex).toBe(0)
	expect(
		fetcher.mock.calls.some(([params]) => params.globalFilter === 'Grace' && params.pagination.pageIndex === 2),
	).toBe(false)
	const calls = fetcher.mock.calls.length
	act(() => {
		table.setRowSelection({ '0': true })
	})
	expect(fetcher).toHaveBeenCalledTimes(calls)
	unmount()
	client.clear()
})

it('does not fetch unapplied draft filters', async () => {
	const { client, wrapper } = harness()
	const fetcher = vi.fn((_params: GridQueryParams) => Promise.resolve({ items: [{ id: '1', name: 'Ada' }], total: 50 }))
	const source = makeSource({ key: ['draft-users'], getAll: fetcher })
	const { result, unmount } = renderHook(
		() =>
			connected.useDataGrid({
				dataSource: source,
				columns,
				draft: true,
				globalFiltering: true,
				pagination: true,
				initialState: { pagination: { pageIndex: 2, pageSize: 10 } },
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	act(() => {
		result.current.setGlobalFilter('Grace')
	})
	expect(fetcher).toHaveBeenCalledTimes(1)
	act(() => {
		result.current.draft.apply()
	})
	await waitFor(() => {
		expect(fetcher).toHaveBeenCalledTimes(2)
	})
	expect(fetcher.mock.calls.map(([params]) => [params.globalFilter, params.pagination.pageIndex])).toEqual([
		[undefined, 2],
		['Grace', 0],
	])
	unmount()
	client.clear()
})

it('switches between pages and infinite without replacing the table or fetching inactive modes', async () => {
	const { client, wrapper } = harness()
	const listFetcher = vi.fn(() => Promise.resolve({ items: [{ id: 'list', name: 'Paged' }], total: 1 }))
	const pageFetcher = vi.fn((args: { cursor: number }) =>
		Promise.resolve({
			items: [{ id: String(args.cursor), name: `Page ${String(args.cursor)}` }],
			next: args.cursor < 1 ? args.cursor + 1 : null,
		}),
	)
	const source = createGridSourceFactory({
		list: {
			prepareArgs: () => ({}),
			getRows: (r: { items: User[]; total: number }) => r.items,
			getRowCount: (r) => r.total,
		},
		infinite: {
			prepareArgs: () => ({}),
			preparePageArgs: ({ pageParam }: { args: object; pageParam: number }) => ({ cursor: pageParam }),
			initialPageParam: 0,
			getRows: (r: { items: User[]; next: number | null }) => r.items,
			getNextPageParam: (r) => r.next,
		},
	})({ key: ['switch'], getAll: listFetcher, getInfinite: pageFetcher })
	const { result, rerender, unmount } = renderHook(
		({ mode }: { mode: 'pages' | 'infinite' }) =>
			connected.useDataGrid({ dataSource: source, columns, pagination: { mode, pageSize: 10 } }),
		{ wrapper, initialProps: { mode: 'pages' } },
	)
	const table = result.current
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.id).toBe('list')
	})
	expect(pageFetcher).not.toHaveBeenCalled()
	rerender({ mode: 'infinite' })
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.id).toBe('0')
	})
	expect(result.current).toBe(table)
	await act(async () => {
		await table.grid.pagination.infinite?.onLoadMore?.({ direction: 'forward' })
	})
	await waitFor(() => {
		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['0', '1'])
	})
	expect(listFetcher).toHaveBeenCalledTimes(1)
	expect(table.grid.pagination.infinite?.hasNextPage).toBe(false)
	rerender({ mode: 'pages' })
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.id).toBe('list')
	})
	expect(result.current).toBe(table)
	expect(pageFetcher).toHaveBeenCalledTimes(2)
	unmount()
	client.clear()
})

it('corrects a first successful out-of-range total', async () => {
	const { client, wrapper } = harness()
	const fetcher = vi.fn((params: { pagination: { pageIndex: number } }) =>
		Promise.resolve({ items: [{ id: String(params.pagination.pageIndex), name: 'Ada' }], total: 11 }),
	)
	const source = makeSource({ key: ['bounds'], getAll: fetcher })
	const { result, unmount } = renderHook(
		() =>
			connected.useDataGrid({
				dataSource: source,
				columns,
				pagination: { pageSize: 10 },
				initialState: { pagination: { pageIndex: 4, pageSize: 10 } },
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.store.state.pagination.pageIndex).toBe(1)
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows[0]?.original.id).toBe('1')
	})
	expect(fetcher.mock.calls.map(([params]) => params.pagination.pageIndex)).toEqual([4, 1])
	unmount()
	client.clear()
})

it('executes source mutations only when enabled and lets explicit handlers replace them', async () => {
	const { client, wrapper } = harness()
	const update = vi.fn((args: { id: string; name?: string }) => Promise.resolve(args))
	const deleted = vi.fn((args: { ids: string[] }) => Promise.resolve(args))
	const single = vi.fn((args: { id: string }) => Promise.resolve(args))
	const fetcher = vi.fn(() => Promise.resolve({ items: [{ id: 'api-1', name: 'Ada' }], total: 1 }))
	const source = makeSource({
		key: ['actions'],
		getAll: fetcher,
		update: {
			fetcher: update,
			prepareArgs: ({ row, values }) => ({
				id: row?.id ?? 'missing',
				...(values.name === undefined ? {} : { name: values.name }),
			}),
		},
		delete: { fetcher: single, prepareArgs: ({ row }) => ({ id: row.id }) },
		deleteMany: { fetcher: deleted, prepareArgs: ({ rows }) => ({ ids: rows.map((row) => row.id) }) },
	})
	const handler = vi.fn(() => Promise.resolve())
	const { result, rerender, unmount } = renderHook(
		({ editing }: { editing: false | true | { onSave: typeof handler } }) =>
			connected.useDataGrid({
				dataSource: source,
				columns,
				getRowId: () => 'table-1',
				editing,
				selection: true,
				deleting: { bulk: true },
			}),
		{ wrapper, initialProps: { editing: false as false | true | { onSave: typeof handler } } },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	expect(result.current.options.editing).toBeUndefined()
	expect(update).not.toHaveBeenCalled()
	rerender({ editing: true })
	act(() => {
		result.current.editing.start('table-1')
		result.current.editing.setValue('name', 'Grace')
	})
	await act(async () => {
		await result.current.editing.commit()
	})
	expect(update).toHaveBeenCalledWith({ id: 'api-1', name: 'Grace' }, expect.anything())
	await waitFor(() => {
		expect(fetcher).toHaveBeenCalledTimes(2)
	})
	rerender({ editing: { onSave: handler } })
	act(() => {
		result.current.editing.start('table-1')
	})
	await act(async () => {
		await result.current.editing.commit()
	})
	expect(handler).toHaveBeenCalledTimes(1)
	expect(update).toHaveBeenCalledTimes(1)
	expect(fetcher).toHaveBeenCalledTimes(2)
	act(() => {
		result.current.setRowSelection({ 'table-1': true })
	})
	await act(async () => {
		await result.current.deleting.bulk.delete(['table-1'])
	})
	expect(deleted).toHaveBeenCalledWith({ ids: ['api-1'] }, expect.anything())
	expect(single).not.toHaveBeenCalled()
	expect(result.current.store.state.rowSelection).toEqual({})
	unmount()
	client.clear()
})

it('does not clamp a restored page using placeholder totals', async () => {
	const { client, wrapper } = harness()
	let resolve!: (value: { items: User[]; total: number }) => void
	const pending = new Promise<{ items: User[]; total: number }>((done) => {
		resolve = done
	})
	const source = makeSource({
		key: ['placeholder'],
		getAll: { fetcher: () => pending, options: { placeholderData: { items: [], total: 0 } } },
	})
	const { result, unmount } = renderHook(
		() =>
			connected.useDataGrid({
				dataSource: source,
				columns,
				pagination: true,
				initialState: { pagination: { pageIndex: 3, pageSize: 10 } },
			}),
		{ wrapper },
	)
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	await act(async () => {
		resolve({ items: [{ id: '1', name: 'Ada' }], total: 50 })
		await pending
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	unmount()
	client.clear()
})

it('reports missing executors instead of silently enabling an unusable action', () => {
	const { client, wrapper } = harness()
	const source = makeSource({ key: ['missing'], getAll: () => Promise.resolve({ items: [], total: 0 }) })
	expect(() =>
		renderHook(() => connected.useDataGrid({ dataSource: source, columns, editing: true }), { wrapper }),
	).toThrow('editing requires dataSource.update or editing.onSave')
	client.clear()
})

it('wires create and single delete with original entity arguments', async () => {
	const { client, wrapper } = harness()
	const create = vi.fn((args: { body: Partial<User> }) => Promise.resolve(args))
	const remove = vi.fn((args: { id: string }) => Promise.resolve(args))
	const source = makeSource({
		key: ['create-delete'],
		getAll: () => Promise.resolve({ items: [{ id: 'api-1', name: 'Ada' }], total: 1 }),
		create: { fetcher: create, prepareArgs: ({ values }) => ({ body: values }) },
		delete: { fetcher: remove, prepareArgs: ({ row }) => ({ id: row.id }) },
	})
	const { result, unmount } = renderHook(
		() =>
			connected.useDataGrid({ dataSource: source, columns, creating: true, deleting: true, getRowId: () => 'table-1' }),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	act(() => {
		result.current.creating.start()
		result.current.creating.setValue('name', 'Grace')
	})
	await act(async () => {
		await result.current.creating.commit()
	})
	expect(create).toHaveBeenCalledWith({ body: { name: 'Grace' } }, expect.anything())
	await act(async () => {
		await result.current.deleting.delete('table-1')
	})
	expect(remove).toHaveBeenCalledWith({ id: 'api-1' }, expect.anything())
	unmount()
	client.clear()
})

it('deduplicates concurrent next-page requests and preserves rows across failure and retry', async () => {
	const { client, wrapper } = harness()
	let rejectPage!: (error: Error) => void
	let attempts = 0
	const pageFetcher = vi.fn((args: { cursor: number; search: unknown }) => {
		if (args.cursor === 1 && attempts++ === 0)
			return new Promise<{ items: User[]; next: number | null }>((_resolve, reject) => {
				rejectPage = reject
			})
		return Promise.resolve({
			items: [{ id: `${String(args.search)}-${String(args.cursor)}`, name: 'Ada' }],
			next: args.cursor === 0 ? 1 : null,
		})
	})
	const source = createGridSourceFactory({
		list: { prepareArgs: () => ({}), getRows: (rows: User[]) => rows },
		infinite: {
			prepareArgs: ({ globalFilter }) => ({ search: globalFilter }),
			preparePageArgs: ({ args, pageParam }: { args: { search: unknown }; pageParam: number }) => ({
				...args,
				cursor: pageParam,
			}),
			initialPageParam: 0,
			getRows: (page: { items: User[]; next: number | null }) => page.items,
			getNextPageParam: (page) => page.next,
		},
	})({ key: ['next-page'], getAll: () => Promise.resolve([] as User[]), getInfinite: pageFetcher })
	const { result, unmount } = renderHook(
		() =>
			connected.useDataGrid({ dataSource: source, columns, pagination: { mode: 'infinite' }, globalFiltering: true }),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	let first!: Promise<void> | void
	let second!: Promise<void> | void
	let outcomes!: Promise<PromiseSettledResult<void>[]>
	act(() => {
		first = result.current.grid.pagination.infinite?.onLoadMore?.({ direction: 'forward' })
		second = result.current.grid.pagination.infinite?.onLoadMore?.({ direction: 'forward' })
		outcomes = Promise.allSettled([first, second])
	})
	expect(pageFetcher).toHaveBeenCalledTimes(2)
	await act(async () => {
		rejectPage(new Error('offline'))
		await outcomes
	})
	expect(result.current.getRowModel().rows).toHaveLength(1)
	expect(result.current.store.state.loading.isError).toBe(false)
	await act(async () => {
		await result.current.grid.pagination.infinite?.onLoadMore?.({ direction: 'forward' })
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(2)
	})
	act(() => {
		result.current.setGlobalFilter('new')
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows.map((row) => row.original.id)).toEqual(['new-0'])
	})
	unmount()
	client.clear()
})

it('reuses prefetched public options when the grid mounts', async () => {
	const { client, wrapper } = harness()
	const fetcher = vi.fn(() => Promise.resolve({ items: [{ id: '1', name: 'Ada' }], total: 1 }))
	const source = makeSource({ key: ['prefetched'], getAll: { fetcher, options: { staleTime: Infinity } } })
	// eslint-disable-next-line @typescript-eslint/no-deprecated -- supported TanStack v5 prefetch interoperability
	await client.prefetchQuery(
		source.queries.list({
			pagination: { pageIndex: 0, pageSize: 10 },
			sorting: [],
			columnFilters: [],
			globalFilter: undefined,
		}),
	)
	const { result, unmount } = renderHook(() => connected.useDataGrid({ dataSource: source, columns }), { wrapper })
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	expect(fetcher).toHaveBeenCalledTimes(1)
	unmount()
	client.clear()
})
