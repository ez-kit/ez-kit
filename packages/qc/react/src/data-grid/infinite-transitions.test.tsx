import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { it, expect, vi } from 'vitest'

import { withQuery } from './with-query'

import type { GridInfiniteParams } from './types'
import type { ReactNode } from 'react'
it('new criteria can load while previous native next page remains pending', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
	type Page = { items: { id: string }[]; next: number | null }
	let resolveOld!: (p: Page) => void
	const old = new Promise<Page>((r) => {
		resolveOld = r
	})
	const fetch = vi.fn((filter: string, cursor: number) =>
		filter === 'A' && cursor === 1
			? old
			: Promise.resolve({ items: [{ id: `${filter}${String(cursor)}` }], next: cursor === 0 ? 1 : null }),
	)
	const source = {
		getInfinite: {
			query: ({ globalFilter }: GridInfiniteParams) => ({
				queryKey: ['audit3', globalFilter],
				initialPageParam: 0,
				getNextPageParam: (page: Page) => page.next,
				queryFn: ({ pageParam }: { pageParam: number }) => fetch(String(globalFilter ?? 'A'), pageParam),
			}),
			getRows: (page: Page) => page.items,
		},
	}
	const h = renderHook(
		() =>
			connected.useDataGrid({
				dataSource: source,
				columns: [{ accessorKey: 'id' }],
				pagination: { mode: 'infinite' },
				globalFiltering: true,
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(h.result.current.getRowModel().rows[0]?.original.id).toBe('A0')
	})
	let first: Promise<void> | void, second: Promise<void> | void
	act(() => {
		first = h.result.current.grid.pagination.infinite?.onLoadMore?.({ direction: 'forward' })
	})
	await waitFor(() => {
		expect(fetch).toHaveBeenCalledWith('A', 1)
	})
	act(() => {
		h.result.current.setGlobalFilter('B')
	})
	await waitFor(() => {
		expect(h.result.current.getRowModel().rows[0]?.original.id).toBe('B0')
	})
	act(() => {
		second = h.result.current.grid.pagination.infinite?.onLoadMore?.({ direction: 'forward' })
	})
	await act(async () => {
		resolveOld({ items: [{ id: 'A1' }], next: null })
		await Promise.allSettled([first, second])
	})
	const calls = fetch.mock.calls
	h.unmount()
	client.clear()

	expect(calls).toContainEqual(['B', 1])
})
