import { onlineManager, queryOptions, useQuery } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Query } from './query'
import { deferred, renderWithClient } from './test-kit'

import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

type Device = {
	id: number
}

const devices: Device[] = [{ id: 1 }]

function renderList(data: Device[]): ReactNode {
	return <span>devices: {data.map((d) => d.id).join(',')}</span>
}

afterEach(() => {
	onlineManager.setOnline(true)
})

describe('Query — query options', () => {
	it('runs the queryFn once and stores the result under the query key', async () => {
		const queryFn = vi.fn(() => Promise.resolve(devices))
		const { client } = renderWithClient(
			<Query query={queryOptions({ queryKey: ['devices'], queryFn })}>{renderList}</Query>,
		)

		expect(await screen.findByText('devices: 1')).toBeInTheDocument()
		expect(queryFn).toHaveBeenCalledTimes(1)
		expect(client.getQueryData(['devices'])).toEqual(devices)
	})

	it('passes the result of select inside query to children', async () => {
		renderWithClient(
			<Query
				query={queryOptions({
					queryKey: ['devices'],
					queryFn: () => Promise.resolve({ items: [1, 2, 3] }),
					select: (d) => d.items.length,
				})}
			>
				{(count) => <span>count: {count}</span>}
			</Query>,
		)

		expect(await screen.findByText('count: 3')).toBeInTheDocument()
	})

	it('shares the cache with a plain useQuery on the same key', async () => {
		const queryFn = vi.fn(() => Promise.resolve(devices))
		const options = queryOptions({ queryKey: ['devices'], queryFn })
		function Plain(): ReactNode {
			const { data } = useQuery(options)
			return <span>plain: {data?.length ?? 'none'}</span>
		}

		renderWithClient(
			<>
				<Query query={options}>{renderList}</Query>
				<Plain />
			</>,
		)

		expect(await screen.findByText('devices: 1')).toBeInTheDocument()
		expect(await screen.findByText('plain: 1')).toBeInTheDocument()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})
})

describe('Query — data renders children', () => {
	it('renders children with the data and the useQuery result', async () => {
		const seen: UseQueryResult<Device[]>[] = []
		renderWithClient(
			<Query query={{ queryKey: ['devices'], queryFn: () => Promise.resolve(devices) }}>
				{(data, q) => {
					seen.push(q)
					return renderList(data)
				}}
			</Query>,
		)

		expect(await screen.findByText('devices: 1')).toBeInTheDocument()
		expect(seen.at(-1)?.status).toBe('success')
	})

	it('keeps rendering children during a background refetch', async () => {
		const second = deferred<Device[]>()
		const queryFn = vi.fn<() => Promise<Device[]>>().mockResolvedValueOnce(devices).mockReturnValueOnce(second.promise)
		const { client } = renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn }}
				loading={<span>loading</span>}
			>
				{(data, q) => (
					<span>
						{renderList(data)} fetching: {String(q.isFetching)}
					</span>
				)}
			</Query>,
		)
		await screen.findByText(/fetching: false/)

		act(() => {
			void client.refetchQueries({ queryKey: ['devices'] })
		})

		expect(await screen.findByText(/fetching: true/)).toBeInTheDocument()
		expect(screen.queryByText('loading')).not.toBeInTheDocument()
		await act(async () => {
			second.resolve([{ id: 2 }])
			await second.promise
		})
		expect(await screen.findByText(/devices: 2/)).toBeInTheDocument()
	})

	it('renders children with placeholder data', () => {
		renderWithClient(
			<Query
				query={{
					queryKey: ['devices'],
					queryFn: () => deferred<Device[]>().promise,
					placeholderData: [{ id: 0 }],
				}}
				loading={<span>loading</span>}
			>
				{(data, q) => (
					<span>
						{renderList(data)} placeholder: {String(q.isPlaceholderData)}
					</span>
				)}
			</Query>,
		)

		expect(screen.getByText(/placeholder: true/)).toHaveTextContent('devices: 0')
		expect(screen.queryByText('loading')).not.toBeInTheDocument()
	})

	it('keeps the last data when a background refetch fails', async () => {
		const queryFn = vi
			.fn<() => Promise<Device[]>>()
			.mockResolvedValueOnce(devices)
			.mockRejectedValueOnce(new Error('boom'))
		const errorFallback = vi.fn(() => <span>error</span>)
		const { client } = renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn }}
				error={errorFallback}
			>
				{(data, q) => (
					<span>
						{renderList(data)} error: {q.error?.message ?? 'none'}
					</span>
				)}
			</Query>,
		)
		await screen.findByText(/error: none/)

		await act(async () => {
			await client.refetchQueries({ queryKey: ['devices'] })
		})

		expect(await screen.findByText(/error: boom/)).toHaveTextContent('devices: 1')
		expect(errorFallback).not.toHaveBeenCalled()
	})
})

describe('Query — first load renders loading', () => {
	it('renders loading and does not call children', () => {
		const children = vi.fn(renderList)
		renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn: () => deferred<Device[]>().promise }}
				loading={<span>loading</span>}
			>
				{children}
			</Query>,
		)

		expect(screen.getByText('loading')).toBeInTheDocument()
		expect(children).not.toHaveBeenCalled()
	})

	it('renders loading while the first fetch is paused offline', () => {
		onlineManager.setOnline(false)
		const { client } = renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn: () => Promise.resolve(devices) }}
				loading={<span>loading</span>}
				idle={<span>idle</span>}
			>
				{renderList}
			</Query>,
		)

		expect(client.getQueryState(['devices'])?.fetchStatus).toBe('paused')
		expect(screen.getByText('loading')).toBeInTheDocument()
		expect(screen.queryByText('idle')).not.toBeInTheDocument()
	})
})

describe('Query — disabled query renders idle', () => {
	it('renders idle, not loading, and never calls the queryFn', () => {
		const queryFn = vi.fn(() => Promise.resolve(devices))
		renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn, enabled: false }}
				loading={<span>loading</span>}
				idle={<span>idle</span>}
			>
				{renderList}
			</Query>,
		)

		expect(screen.getByText('idle')).toBeInTheDocument()
		expect(screen.queryByText('loading')).not.toBeInTheDocument()
		expect(queryFn).not.toHaveBeenCalled()
	})

	it('renders loading and then children once the query is enabled', async () => {
		const response = deferred<Device[]>()
		function Gate({ enabled }: { enabled: boolean }): ReactNode {
			return (
				<Query
					query={{ queryKey: ['devices'], queryFn: () => response.promise, enabled }}
					loading={<span>loading</span>}
					idle={<span>idle</span>}
				>
					{renderList}
				</Query>
			)
		}
		const { rerender } = renderWithClient(<Gate enabled={false} />)
		expect(screen.getByText('idle')).toBeInTheDocument()

		rerender(<Gate enabled />)

		expect(await screen.findByText('loading')).toBeInTheDocument()
		await act(async () => {
			response.resolve(devices)
			await response.promise
		})
		expect(await screen.findByText('devices: 1')).toBeInTheDocument()
	})
})

describe('Query — error without data renders error', () => {
	it('renders the error fallback with the error and does not call children', async () => {
		const children = vi.fn(renderList)
		renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn: () => Promise.reject(new Error('boom')) }}
				error={(error, q) => (
					<span>
						failed: {error.message} status: {q.status}
					</span>
				)}
			>
				{children}
			</Query>,
		)

		expect(await screen.findByText('failed: boom status: error')).toBeInTheDocument()
		expect(children).not.toHaveBeenCalled()
	})

	it('renders loading while q.refetch() from the fallback runs, then children', async () => {
		const retry = deferred<Device[]>()
		const queryFn = vi
			.fn<() => Promise<Device[]>>()
			.mockRejectedValueOnce(new Error('boom'))
			.mockReturnValueOnce(retry.promise)
		renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn }}
				loading={<span>loading</span>}
				error={(error, q) => (
					<button
						type='button'
						onClick={() => void q.refetch()}
					>
						retry {error.message}
					</button>
				)}
			>
				{renderList}
			</Query>,
		)

		const retryButton = await screen.findByRole('button', { name: 'retry boom' })
		act(() => {
			retryButton.click()
		})
		expect(await screen.findByText('loading')).toBeInTheDocument()
		await act(async () => {
			retry.resolve(devices)
			await retry.promise
		})
		expect(await screen.findByText('devices: 1')).toBeInTheDocument()
	})

	it('renders the error fallback again when the refetch fails', async () => {
		const queryFn = vi
			.fn<() => Promise<Device[]>>()
			.mockRejectedValueOnce(new Error('boom'))
			.mockRejectedValueOnce(new Error('again'))
		renderWithClient(
			<Query
				query={{ queryKey: ['devices'], queryFn }}
				error={(error, q) => (
					<button
						type='button'
						onClick={() => void q.refetch()}
					>
						retry {error.message}
					</button>
				)}
			>
				{renderList}
			</Query>,
		)

		const retryButton = await screen.findByRole('button', { name: 'retry boom' })
		act(() => {
			retryButton.click()
		})

		expect(await screen.findByRole('button', { name: 'retry again' })).toBeInTheDocument()
		expect(queryFn).toHaveBeenCalledTimes(2)
	})
})

describe('Query — loading and idle default to nothing', () => {
	it('renders nothing during the first load without a loading fallback', () => {
		const { container } = renderWithClient(
			<Query query={{ queryKey: ['devices'], queryFn: () => deferred<Device[]>().promise }}>{renderList}</Query>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('renders nothing for a disabled query without an idle fallback', () => {
		const { container } = renderWithClient(
			<Query query={{ queryKey: ['devices'], queryFn: () => Promise.resolve(devices), enabled: false }}>
				{renderList}
			</Query>,
		)

		expect(container).toBeEmptyDOMElement()
	})
})
