'use client'

import { InfiniteQuery } from '@ez-kit/query-react'
import { QueryClient, QueryClientProvider, infiniteQueryOptions } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { wait } from './demo-api'

function createDemo() {
	let failNext = false
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const query = infiniteQueryOptions({
		queryKey: ['device-pages'],
		initialPageParam: 0,
		staleTime: 60_000,
		queryFn: async ({ pageParam, signal }) => {
			await wait()
			signal.throwIfAborted()
			if (failNext) {
				failNext = false
				throw new Error('Page request failed. Retry to keep loading.')
			}
			return {
				items: Array.from({ length: 3 }, (_, index) => ({
					id: pageParam * 3 + index + 1,
					name: `Device ${String(pageParam * 3 + index + 1)}`,
				})),
				next: pageParam < 2 ? pageParam + 1 : undefined,
			}
		},
		getNextPageParam: (page) => page.next,
	})
	return {
		client,
		query,
		failNextRequest: () => {
			failNext = true
		},
	}
}

export default function InfiniteListExample() {
	const [demo] = useState(createDemo)
	return (
		<QueryClientProvider client={demo.client}>
			<section
				aria-label='Paginated devices'
				className='not-prose w-full max-w-md space-y-4'
			>
				<InfiniteQuery
					query={demo.query}
					loading={<p role='status'>Loading first page…</p>}
					error={(error, q) => (
						<div role='alert'>
							{error.message}
							<Button
								onClick={() => {
									void q.refetch()
								}}
							>
								Retry
							</Button>
						</div>
					)}
				>
					{(data, q) => (
						<>
							<ul className='grid grid-cols-3 gap-2'>
								{data.pages.flatMap((page) =>
									page.items.map((device) => (
										<li
											key={device.id}
											className='rounded border p-2 text-sm'
										>
											{device.name}
										</li>
									)),
								)}
							</ul>
							{q.isFetchNextPageError && (
								<p
									role='alert'
									className='text-sm text-red-600 dark:text-red-400'
								>
									{q.error.message}
								</p>
							)}
							<div className='flex flex-wrap gap-2'>
								<Button
									disabled={!q.hasNextPage || q.isFetching}
									onClick={() => {
										void q.fetchNextPage()
									}}
								>
									{q.isFetchingNextPage ? 'Loading more…' : q.hasNextPage ? 'Load more' : 'All devices loaded'}
								</Button>
								<Button
									variant='outline'
									disabled={!q.hasNextPage || q.isFetching}
									onClick={() => {
										demo.failNextRequest()
										void q.fetchNextPage()
									}}
								>
									Fail next page
								</Button>
							</div>
						</>
					)}
				</InfiniteQuery>
			</section>
		</QueryClientProvider>
	)
}
