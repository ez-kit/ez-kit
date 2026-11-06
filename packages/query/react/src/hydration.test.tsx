import { dehydrate, hydrate, infiniteQueryOptions, queryOptions, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import { InfiniteQuery } from './infinite-query'
import { Query } from './query'
import { createTestClient, renderWithClient } from './test-kit'

it('renders prefetched data on the server and hydrates both gates without an immediate refetch', async () => {
	const server = createTestClient()
	const queryFn = vi.fn(() => Promise.resolve('prefetched'))
	const pageFn = vi.fn(({ pageParam }: { pageParam: number }) => Promise.resolve([pageParam]))
	const query = queryOptions({ queryKey: ['hydrated'], queryFn, staleTime: 60_000 })
	const infinite = infiniteQueryOptions({
		queryKey: ['hydrated-pages'],
		queryFn: pageFn,
		staleTime: 60_000,
		initialPageParam: 0,
		getNextPageParam: (_last, _pages, lastParam) => lastParam + 1,
	})
	await Promise.all([server.query(query), server.infiniteQuery(infinite)])
	const content = (
		<>
			<Query
				query={query}
				loading='loading'
			>
				{(data) => <p>{data}</p>}
			</Query>
			<InfiniteQuery
				query={infinite}
				loading='loading'
			>
				{(data, q) => (
					<>
						<p>Pages: {data.pages.flat().join(',')}</p>
						<button
							onClick={() => {
								void q.fetchNextPage()
							}}
						>
							More
						</button>
					</>
				)}
			</InfiniteQuery>
		</>
	)
	const html = renderToString(<QueryClientProvider client={server}>{content}</QueryClientProvider>)
	expect(html).toContain('prefetched')
	expect(html).not.toContain('loading')
	const browser = createTestClient()
	hydrate(browser, JSON.parse(JSON.stringify(dehydrate(server))) as ReturnType<typeof dehydrate>)
	renderWithClient(content, browser)
	expect(screen.getByText('prefetched')).toBeInTheDocument()
	expect(screen.getByText('Pages: 0')).toBeInTheDocument()
	expect(queryFn).toHaveBeenCalledTimes(1)
	expect(pageFn).toHaveBeenCalledTimes(1)
	fireEvent.click(screen.getByText('More'))
	expect(await screen.findByText('Pages: 0,1')).toBeInTheDocument()
	expect(pageFn.mock.calls.map(([context]) => context.pageParam)).toEqual([0, 1])
	server.clear()
})
