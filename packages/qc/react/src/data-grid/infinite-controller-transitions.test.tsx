import { createDataGrid, useInfiniteScroll } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents } from '@ez-kit/data-grid-shadcn'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { fixtureSource } from './testing/grid-source.fixture'

import { withQuery } from './index'

it.each(['success', 'error'] as const)(
	'scopes the real infinite controller and late %s to the current query',
	async (outcome) => {
		const connected = withQuery(createDataGrid({ components: allComponents, features: allDataGridFeatures }))
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		type Page = { items: { id: string }[]; next: number | null }
		let rejectA!: (error: unknown) => void
		let resolveA!: (page: Page) => void
		let resolveB!: (page: Page) => void
		const pendingB = new Promise<Page>((resolve) => {
			resolveB = resolve
		})
		const pendingA = new Promise<Page>((resolve, reject) => {
			resolveA = resolve
			rejectA = reject
		})
		const fetcher = vi.fn((scope: string, cursor: number) =>
			scope === 'A' && cursor === 1
				? pendingA
				: scope === 'B' && cursor === 1
					? pendingB
					: Promise.resolve({ items: [{ id: `${scope}${String(cursor)}` }], next: cursor === 0 ? 1 : null }),
		)
		const source = (scope: string) => ({
			getInfinite: {
				query: () => ({
					queryKey: ['infinite-scope', scope],
					initialPageParam: 0,
					getNextPageParam: (p: Page) => p.next,
					queryFn: ({ pageParam }: { pageParam: number }) => fetcher(scope, pageParam),
				}),
				getRows: (p: Page) => p.items,
			},
		})
		let controller!: ReturnType<typeof useInfiniteScroll>
		function Probe() {
			controller = useInfiniteScroll()
			return null
		}
		function Parent({ scope }: { scope: string }) {
			return (
				<connected.DataGrid
					dataSource={fixtureSource(source(scope))}
					columns={[{ accessorKey: 'id' }]}
					pagination={{ mode: 'infinite', trigger: 'manual' }}
				>
					<Probe />
				</connected.DataGrid>
			)
		}
		const h = render(
			<QueryClientProvider client={client}>
				<Parent scope='A' />
			</QueryClientProvider>,
		)
		await waitFor(() => {
			expect(controller.hasNextPage).toBe(true)
		})
		act(() => {
			controller.loadMore()
		})
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledWith('A', 1)
		})
		h.rerender(
			<QueryClientProvider client={client}>
				<Parent scope='B' />
			</QueryClientProvider>,
		)
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledWith('B', 0)
		})
		await waitFor(() => {
			expect(controller.hasNextPage).toBe(true)
		})
		act(() => {
			controller.loadMore()
		})
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledWith('B', 1)
		})
		const oldError = new Error('A failed after scope switched to B')
		await act(async () => {
			if (outcome === 'error') rejectA(oldError)
			else resolveA({ items: [{ id: 'A1' }], next: null })
			await Promise.resolve()
		})
		expect(controller.error).toBeNull()
		expect(controller.isFetching).toBe(true)
		await act(async () => {
			resolveB({ items: [{ id: 'B1' }], next: null })
			await Promise.resolve()
		})
		await waitFor(() => {
			expect(controller.isFetching).toBe(false)
		})
		h.unmount()
		client.clear()
	},
)
