import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

import type { GridQueryParams } from './index'
import type { PropsWithChildren } from 'react'

type User = { id: string; name: string }
type Page = { items: User[]; total: number }
const kit = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
const columns = kit.createColumns<User>([{ accessorKey: 'name' }])
const makeSource = createGridSourceFactory({
	list: { prepareArgs: (params) => params, getRows: (page: Page) => page.items, getRowCount: (page) => page.total },
})
function harness() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	return { client, wrapper }
}
function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

it('deleting the last row refetches the old page then corrects to the final existing page', async () => {
	const { client, wrapper } = harness()
	let rows = Array.from({ length: 5 }, (_, id) => ({ id: String(id), name: `User ${String(id)}` }))
	const fetcher = vi.fn(({ pagination }: GridQueryParams) =>
		Promise.resolve({
			items: rows.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize),
			total: rows.length,
		}),
	)
	const source = makeSource({
		key: ['last-row'],
		getAll: fetcher,
		delete: {
			fetcher: (id: string) => {
				rows = rows.filter((row) => row.id !== id)
				return Promise.resolve()
			},
			prepareArgs: ({ row }) => row.id,
		},
	})
	const { result, unmount } = renderHook(
		() =>
			kit.useDataGrid({
				dataSource: source,
				columns,
				getRowId: (row) => row.id,
				pagination: true,
				deleting: true,
				initialState: { pagination: { pageIndex: 2, pageSize: 2 } },
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows.map((row) => row.id)).toEqual(['4'])
	})
	await act(async () => {
		await result.current.deleting.delete('4')
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows.map((row) => row.id)).toEqual(['2', '3'])
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(1)
	expect(result.current.getPageCount()).toBe(2)
	expect(fetcher.mock.calls.map(([params]) => params.pagination.pageIndex)).toEqual([2, 2, 1])
	unmount()
	client.clear()
})

it('corrects an empty collection to page zero once', async () => {
	const { client, wrapper } = harness()
	const fetcher = vi.fn((_params: GridQueryParams) => Promise.resolve({ items: [] as User[], total: 0 }))
	const source = makeSource({ key: ['empty'], getAll: fetcher })
	const { result, unmount } = renderHook(
		() =>
			kit.useDataGrid({
				dataSource: source,
				columns,
				pagination: true,
				initialState: { pagination: { pageIndex: 3, pageSize: 10 } },
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(fetcher).toHaveBeenCalledTimes(2)
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(0)
	expect(fetcher.mock.calls.map(([params]) => params.pagination.pageIndex)).toEqual([3, 0])
	expect(result.current.getRowModel().rows).toHaveLength(0)
	unmount()
	client.clear()
})

it('keeps an unknown-total empty page and replaces a previous known total on source change', async () => {
	const { client, wrapper } = harness()
	const known = makeSource({
		key: ['known'],
		getAll: () => Promise.resolve({ items: [{ id: '1', name: 'Ada' }], total: 100 }),
	})
	const unknown = createGridSourceFactory({
		list: { prepareArgs: (params) => params, getRows: (rows: User[]) => rows },
	})({ key: ['unknown'], getAll: () => Promise.resolve([] as User[]) })
	const { result, rerender, unmount } = renderHook(
		({ useUnknown }: { useUnknown: boolean }) =>
			kit.useDataGrid({
				dataSource: useUnknown ? unknown : known,
				columns,
				pagination: true,
				initialState: { pagination: { pageIndex: 3, pageSize: 10 } },
			}),
		{ wrapper, initialProps: { useUnknown: false } },
	)
	await waitFor(() => {
		expect(result.current.getPageCount()).toBe(10)
	})
	rerender({ useUnknown: true })
	await waitFor(() => {
		expect(result.current.store.state.loading.isPending).toBe(false)
		expect(result.current.getRowModel().rows).toHaveLength(0)
	})
	expect(result.current.getPageCount()).toBe(-1)
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	unmount()
	client.clear()
})

it('does not clamp navigation using previous-page placeholder totals', async () => {
	const { client, wrapper } = harness()
	const pending = deferred<Page>()
	const fetcher = vi.fn(({ pagination }: GridQueryParams) =>
		pagination.pageIndex === 0 ? Promise.resolve({ items: [{ id: 'old', name: 'Ada' }], total: 1 }) : pending.promise,
	)
	const source = makeSource({
		key: ['previous-page'],
		getAll: { fetcher, options: { placeholderData: keepPreviousData } },
	})
	const { result, unmount } = renderHook(() => kit.useDataGrid({ dataSource: source, columns, pagination: true }), {
		wrapper,
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	act(() => {
		result.current.setPageIndex(3)
	})
	await waitFor(() => {
		expect(fetcher).toHaveBeenCalledTimes(2)
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	expect(result.current.getRowModel().rows[0]?.original.id).toBe('old')
	await act(async () => {
		pending.resolve({ items: [{ id: 'new', name: 'Grace' }], total: 100 })
		await pending.promise
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows[0]?.original.id).toBe('new')
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	unmount()
	client.clear()
})

it('leaves server-filtered, sorted and paged rows in their returned order', async () => {
	const { client, wrapper } = harness()
	const rows = [
		{ id: 'z', name: 'Zed' },
		{ id: 'b', name: 'Bob' },
	]
	const fetcher = vi.fn((_params: GridQueryParams) => Promise.resolve({ items: rows, total: 100 }))
	const source = makeSource({ key: ['server-owned'], getAll: fetcher })
	const { result, unmount } = renderHook(
		() =>
			kit.useDataGrid({
				dataSource: source,
				columns,
				pagination: true,
				sorting: true,
				globalFiltering: true,
				filtering: true,
				initialState: {
					pagination: { pageIndex: 2, pageSize: 10 },
					sorting: [{ id: 'name', desc: false }],
					globalFilter: 'Ada',
					columnFilters: [{ id: 'name', value: 'Ada' }],
				},
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getRowModel().rows.map((row) => row.original)).toEqual(rows)
	})
	expect(fetcher.mock.calls[0]?.[0]).toMatchObject({
		pagination: { pageIndex: 2, pageSize: 10 },
		globalFilter: 'Ada',
		sorting: [{ id: 'name', desc: false }],
	})
	unmount()
	client.clear()
})

it('waits for refetch before correcting a restored page from stale cached totals', async () => {
	const { client, wrapper } = harness()
	const pending = deferred<Page>()
	const fetcher = vi.fn((_params: GridQueryParams) => pending.promise)
	const source = makeSource({ key: ['stale-total'], getAll: fetcher })
	const restored = {
		pagination: { pageIndex: 3, pageSize: 10 },
		sorting: [],
		columnFilters: [],
		globalFilter: undefined,
	}
	client.setQueryData(source.queries.list(restored).queryKey, { items: [], total: 0 })
	const { result, unmount } = renderHook(
		() =>
			kit.useDataGrid({
				dataSource: source,
				columns,
				pagination: true,
				initialState: { pagination: restored.pagination },
			}),
		{ wrapper },
	)
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	expect(fetcher.mock.calls.map(([request]) => request.pagination.pageIndex)).toEqual([3])
	await act(async () => {
		pending.resolve({ items: [{ id: '3', name: 'Ada' }], total: 50 })
		await pending.promise
	})
	await waitFor(() => {
		expect(result.current.getRowModel().rows).toHaveLength(1)
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	unmount()
	client.clear()
})

it('accepts a response with an omitted total without keeping the previous count', async () => {
	const { client, wrapper } = harness()
	type Response = { items: User[]; total?: number }
	const fetcher = vi
		.fn<() => Promise<Response>>()
		.mockResolvedValueOnce({ items: [{ id: '1', name: 'Ada' }], total: 100 })
		.mockResolvedValue({ items: [] })
	const source = createGridSourceFactory({
		list: {
			prepareArgs: (params) => params,
			getRows: (response: Response) => response.items,
			getRowCount: (response) => response.total,
		},
	})({ key: ['optional-total'], getAll: fetcher })
	const { result, unmount } = renderHook(
		() =>
			kit.useDataGrid({
				dataSource: source,
				columns,
				pagination: true,
				initialState: { pagination: { pageIndex: 3, pageSize: 10 } },
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(result.current.getPageCount()).toBe(10)
	})
	await act(async () => {
		await client.invalidateQueries({ queryKey: ['optional-total'] })
	})
	await waitFor(() => {
		expect(result.current.getPageCount()).toBe(-1)
	})
	expect(result.current.store.state.pagination.pageIndex).toBe(3)
	unmount()
	client.clear()
})
