import { infiniteQueryOptions, skipToken } from '@tanstack/react-query'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InfiniteQuery } from './infinite-query'
import { QueryProvider } from './query-provider'
import { deferred, ErrorBoundary, renderWithClient } from './test-kit'

import type { ReactNode } from 'react'

describe('InfiniteQuery', () => {
	it('isolates pagination, keeps loaded pages during pending and errors, and retries the failed page', async () => {
		const next = deferred<number[]>()
		const queryFn = vi
			.fn<({ pageParam }: { pageParam: number }) => Promise<number[]>>()
			.mockResolvedValueOnce([1])
			.mockReturnValueOnce(next.promise)
			.mockResolvedValueOnce([2])
		const options = infiniteQueryOptions({
			queryKey: ['pages'],
			queryFn,
			initialPageParam: 0,
			getNextPageParam: (_last, pages) => (pages.length < 2 ? pages.length : undefined),
		})
		let parentRenders = 0
		let siblingRenders = 0
		function Sibling(): ReactNode {
			siblingRenders += 1
			return null
		}
		function Parent(): ReactNode {
			parentRenders += 1
			return (
				<>
					<Sibling />
					<InfiniteQuery
						query={options}
						loading={<p>Loading</p>}
						error={() => <p>Initial error</p>}
					>
						{(data, q) => (
							<>
								<p>Items: {data.pages.flat().join(',')}</p>
								<button
									disabled={!q.hasNextPage || q.isFetching}
									onClick={() => {
										void q.fetchNextPage()
									}}
								>
									{q.isFetchingNextPage ? 'Loading more' : 'More'}
								</button>
								{q.isFetchNextPageError && <p role='alert'>{q.error.message}</p>}
							</>
						)}
					</InfiniteQuery>
				</>
			)
		}
		renderWithClient(<Parent />)
		expect(screen.getByText('Loading')).toBeInTheDocument()
		const list = await screen.findByText('Items: 1')
		fireEvent.click(screen.getByText('More'))
		expect(await screen.findByText('Loading more')).toBeDisabled()
		expect(screen.getByText('Items: 1')).toBe(list)
		act(() => {
			next.reject(new Error('Next page failed'))
		})
		expect(await screen.findByRole('alert')).toHaveTextContent('Next page failed')
		expect(screen.getByText('Items: 1')).toBe(list)
		expect(screen.queryByText('Initial error')).not.toBeInTheDocument()
		fireEvent.click(screen.getByText('More'))
		expect(await screen.findByText('Items: 1,2')).toBe(list)
		expect(screen.getByText('More')).toBeDisabled()
		expect(queryFn.mock.calls.map(([context]) => context.pageParam)).toEqual([0, 1, 1])
		expect(parentRenders).toBe(1)
		expect(siblingRenders).toBe(1)
	})

	it('passes the native infinite result to the initial error fallback for retry', async () => {
		const queryFn = vi
			.fn<() => Promise<string[]>>()
			.mockRejectedValueOnce(new Error('Offline'))
			.mockResolvedValueOnce(['ok'])
		renderWithClient(
			<InfiniteQuery
				query={{ queryKey: ['retry'], queryFn, initialPageParam: 0, getNextPageParam: () => undefined }}
				error={(error, q) => (
					<button
						onClick={() => {
							void q.refetch()
						}}
					>
						{error.message}: retry
					</button>
				)}
			>
				{(data) => data.pages.flat().join(',')}
			</InfiniteQuery>,
		)
		fireEvent.click(await screen.findByText('Offline: retry'))
		expect(await screen.findByText('ok')).toBeInTheDocument()
	})

	it('inherits provider fallbacks and lets local fallbacks override them', async () => {
		const options = {
			queryKey: ['provider'],
			queryFn: () => Promise.reject(new Error('failed')),
			initialPageParam: 0,
			getNextPageParam: () => undefined,
		}
		const { rerender } = renderWithClient(
			<QueryProvider
				loading='shared loading'
				error={(error) => error.message}
			>
				<InfiniteQuery query={options}>{() => 'data'}</InfiniteQuery>
			</QueryProvider>,
		)
		expect(screen.getByText('shared loading')).toBeInTheDocument()
		expect(await screen.findByText('failed')).toBeInTheDocument()
		rerender(
			<QueryProvider error={() => 'shared error'}>
				<InfiniteQuery
					query={options}
					error={() => 'local error'}
				>
					{() => 'data'}
				</InfiniteQuery>
			</QueryProvider>,
		)
		expect(screen.getByText('local error')).toBeInTheDocument()
	})

	it('renders idle for disabled queries and skipToken without starting a request', () => {
		const queryFn = vi.fn(() => Promise.resolve([1]))
		renderWithClient(
			<QueryProvider idle={<p>shared idle</p>}>
				<InfiniteQuery
					query={{
						queryKey: ['disabled'],
						queryFn,
						enabled: false,
						initialPageParam: 0,
						getNextPageParam: () => undefined,
					}}
				>
					{() => 'data'}
				</InfiniteQuery>
				<InfiniteQuery
					idle={<p>local idle</p>}
					query={{ queryKey: ['skip'], queryFn: skipToken, initialPageParam: 0, getNextPageParam: () => undefined }}
				>
					{() => 'data'}
				</InfiniteQuery>
			</QueryProvider>,
		)
		expect(screen.getByText('shared idle')).toBeInTheDocument()
		expect(screen.getByText('local idle')).toBeInTheDocument()
		expect(queryFn).not.toHaveBeenCalled()
	})

	it('renders selected data and preserves pagination methods', async () => {
		renderWithClient(
			<InfiniteQuery
				query={{
					queryKey: ['selected'],
					queryFn: ({ pageParam }) => Promise.resolve([pageParam]),
					initialPageParam: 3,
					getNextPageParam: () => undefined,
					select: (data) => data.pages.flat(),
				}}
			>
				{(data, q) => (
					<p>
						{data.join(',')}: {String(q.hasNextPage)}
					</p>
				)}
			</InfiniteQuery>,
		)
		expect(await screen.findByText('3: false')).toBeInTheDocument()
	})

	it('throws an initial error to the boundary when there is no fallback', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		try {
			renderWithClient(
				<ErrorBoundary fallback={() => 'boundary'}>
					<InfiniteQuery
						query={{
							queryKey: ['boundary'],
							queryFn: () => Promise.reject(new Error('failed')),
							initialPageParam: 0,
							getNextPageParam: () => undefined,
						}}
					>
						{() => 'data'}
					</InfiniteQuery>
				</ErrorBoundary>,
			)
			expect(await screen.findByText('boundary')).toBeInTheDocument()
		} finally {
			consoleError.mockRestore()
		}
	})
})
