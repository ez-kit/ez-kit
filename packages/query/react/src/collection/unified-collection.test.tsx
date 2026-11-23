import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, expectTypeOf, it, vi } from 'vitest'

import { createCollectionSource, createCollectionSourceFactory, useCollectionQuery } from './index'

import type { CollectionReadInput } from './index'
import type { PropsWithChildren } from 'react'

type Params = { search: string }
type Row = { id: number; name: string }
type Request = Params & { offset: number; limit: number }
type Page = { items: Row[]; nextOffset: number | null; total: number }

const makeSource = createCollectionSourceFactory({
	collection: {
		prepareArgs: (input: CollectionReadInput<Params, number>): Request => ({
			...input.params,
			limit: input.pageSize,
			offset: input.mode === 'pages' ? input.pageIndex * input.pageSize : input.pageParam,
		}),
		getItems: (page: Page) => page.items,
		getTotal: (page) => page.total,
		infinite: { initialPageParam: 0, getNextPageParam: (page) => page.nextOffset },
	},
	delete: { prepareArgs: (input: { id: number }) => input.id },
})

it('stores ordinary and accumulated pages independently and refreshes both with one mutation', async () => {
	let rows = [
		{ id: 1, name: 'Ada' },
		{ id: 2, name: 'Grace' },
	]
	const fetcher = vi.fn(({ search, offset, limit }: Request): Promise<Page> =>
		Promise.resolve({
			items: rows.filter((row) => row.name.includes(search)).slice(offset, offset + limit),
			nextOffset: offset + limit < rows.length ? offset + limit : null,
			total: rows.length,
		}),
	)
	const source = makeSource({
		key: ['unified'],
		collection: { fetcher },
		delete: {
			fetcher: (id: number) => {
				rows = rows.filter((row) => row.id !== id)
				return Promise.resolve()
			},
		},
	})
	const client = new QueryClient()
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const params = { search: '' }
	const { result, unmount } = renderHook(
		() => ({
			list: useCollectionQuery({ source, params, pagination: { mode: 'pages', pageIndex: 0, pageSize: 1 } }),
			feed: useCollectionQuery({ source, params, pagination: { mode: 'infinite', pageSize: 1 } }),
		}),
		{ wrapper },
	)
	expectTypeOf(result.current.list.items).toEqualTypeOf<readonly Row[]>()
	expectTypeOf(result.current.feed.delete.mutateAsync).parameter(0).toEqualTypeOf<{ id: number }>()
	await waitFor(() => {
		expect(result.current.feed.items).toEqual([rows[0]])
		expect(result.current.list.total).toBe(2)
	})
	await act(async () => {
		await result.current.feed.query.fetchNextPage()
	})
	await waitFor(() => {
		expect(result.current.feed.items).toEqual(rows)
	})
	expect(fetcher.mock.calls.map(([request]) => request.offset)).toEqual([0, 0, 1])
	expect(client.getQueryCache().findAll({ queryKey: ['unified'] })).toHaveLength(2)
	await act(async () => {
		await result.current.list.delete.mutateAsync({ id: 1 })
	})
	await waitFor(() => {
		expect(result.current.list.items).toEqual(rows)
		expect(result.current.feed.items).toEqual(rows)
	})
	unmount()
	client.clear()
})

const cursorSource = createCollectionSource({
	key: ['cursor'],
	collection: {
		prepareArgs: (input) => {
			if (input.mode === 'infinite') expectTypeOf(input.pageParam).toEqualTypeOf<string>()
			return input.mode === 'infinite' ? input.pageParam : ''
		},
		fetcher: (cursor: string) => Promise.resolve({ items: [{ id: cursor }], next: cursor + 'next' }),
		getItems: (page) => page.items,
		infinite: { initialPageParam: '', getNextPageParam: (page) => page.next },
	},
})

const pagesSource = createCollectionSource({
	key: ['pages'],
	collection: {
		prepareArgs: () => undefined,
		fetcher: () => Promise.resolve([{ id: 1 }]),
		getItems: (rows) => rows,
	},
})
function useCapabilities() {
	useCollectionQuery({ source: cursorSource, pagination: { mode: 'infinite', pageSize: 20 } })
	// @ts-expect-error infinite mode requires a cursor configuration
	useCollectionQuery({ source: pagesSource, pagination: { mode: 'infinite', pageSize: 20 } })
}

it('checks cursor and mode types at the public entry point', () => {
	expect(useCapabilities).toBeTypeOf('function')
})

it('uses the keys and selected data from native descriptors', async () => {
	const source = createCollectionSource({
		invalidate: false,
		collection: {
			pages: {
				query: () => ({
					queryKey: ['native-collection'],
					queryFn: () => Promise.resolve({ items: [{ id: 'Ada' }] }),
					select: (data: { items: { id: string }[] }) => data.items.map((row) => row.id),
				}),
				getItems: (data: string[]) => data,
			},
		},
	})
	const client = new QueryClient()
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const h = renderHook(
		() =>
			useCollectionQuery({
				source,
				pagination: { mode: 'pages', pageIndex: 0, pageSize: 20 },
			}),
		{ wrapper },
	)
	await waitFor(() => {
		expect(h.result.current.items).toEqual(['Ada'])
	})
	expect(client.getQueryData(['native-collection'])).toEqual({ items: [{ id: 'Ada' }] })
	h.unmount()
	client.clear()
})
