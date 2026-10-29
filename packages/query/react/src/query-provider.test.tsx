import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Query } from './query'
import { QueryProvider } from './query-provider'
import { deferred, ErrorBoundary, renderWithClient } from './test-kit'

import type { ReactNode } from 'react'

const pending = { queryKey: ['pending'], queryFn: () => deferred<string>().promise }
const failing = { queryKey: ['failing'], queryFn: () => Promise.reject(new Error('boom')) }

afterEach(() => {
	vi.restoreAllMocks()
})

function renderValue(value: string): ReactNode {
	return <span>value: {value}</span>
}

describe('QueryProvider — fallback lookup', () => {
	it('uses the provider loading when the gate sets none', () => {
		renderWithClient(
			<QueryProvider loading={<span>spinner</span>}>
				<Query query={pending}>{renderValue}</Query>
			</QueryProvider>,
		)

		expect(screen.getByText('spinner')).toBeInTheDocument()
	})

	it('uses the provider idle when the gate sets none', () => {
		renderWithClient(
			<QueryProvider idle={<span>pick something</span>}>
				<Query query={{ ...pending, enabled: false }}>{renderValue}</Query>
			</QueryProvider>,
		)

		expect(screen.getByText('pick something')).toBeInTheDocument()
	})

	it('lets the gate prop override the provider', () => {
		renderWithClient(
			<QueryProvider loading={<span>spinner</span>}>
				<Query
					query={pending}
					loading={<span>skeleton</span>}
				>
					{renderValue}
				</Query>
			</QueryProvider>,
		)

		expect(screen.getByText('skeleton')).toBeInTheDocument()
		expect(screen.queryByText('spinner')).not.toBeInTheDocument()
	})

	it('lets an explicit null on the gate override the provider', () => {
		const { container } = renderWithClient(
			<QueryProvider loading={<span>spinner</span>}>
				<Query
					query={pending}
					loading={null}
				>
					{renderValue}
				</Query>
			</QueryProvider>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('picks each fallback independently', async () => {
		const response = deferred<string>()
		const queryFn = vi.fn<() => Promise<string>>().mockReturnValueOnce(response.promise)
		renderWithClient(
			<QueryProvider
				loading={<span>provider loading</span>}
				error={() => <span>provider error</span>}
			>
				<Query
					query={{ queryKey: ['independent'], queryFn }}
					error={(error) => <span>gate error: {String(error)}</span>}
				>
					{renderValue}
				</Query>
			</QueryProvider>,
		)
		expect(screen.getByText('provider loading')).toBeInTheDocument()

		await act(async () => {
			response.reject(new Error('boom'))
			await response.promise.catch(() => undefined)
		})

		expect(await screen.findByText('gate error: Error: boom')).toBeInTheDocument()
		expect(screen.queryByText('provider error')).not.toBeInTheDocument()
	})

	it('merges nested providers key by key', async () => {
		renderWithClient(
			<QueryProvider
				loading={<span>outer loading</span>}
				error={() => <span>outer error</span>}
			>
				<QueryProvider loading={<span>inner loading</span>}>
					<Query query={pending}>{renderValue}</Query>
					<Query query={failing}>{renderValue}</Query>
				</QueryProvider>
			</QueryProvider>,
		)

		expect(await screen.findByText('outer error')).toBeInTheDocument()
		expect(screen.getByText('inner loading')).toBeInTheDocument()
		expect(screen.queryByText('outer loading')).not.toBeInTheDocument()
	})

	it('keeps the context stable when the provider re-renders with the same values', async () => {
		const loading = <span>spinner</span>
		const children = vi.fn(renderValue)
		const gate = <Query query={{ queryKey: ['stable'], queryFn: () => Promise.resolve('ok') }}>{children}</Query>
		function Host({ tick }: { tick: number }): ReactNode {
			return (
				<QueryProvider loading={loading}>
					<span>tick {tick}</span>
					{gate}
				</QueryProvider>
			)
		}
		const { rerender } = renderWithClient(<Host tick={0} />)
		await screen.findByText('value: ok')
		const callsBefore = children.mock.calls.length

		rerender(<Host tick={1} />)

		expect(screen.getByText('tick 1')).toBeInTheDocument()
		expect(children).toHaveBeenCalledTimes(callsBefore)
	})
})

describe('Query — error without a fallback is thrown', () => {
	it('throws the query error to the nearest error boundary', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const caught: unknown[] = []
		const boom = new Error('boom')
		renderWithClient(
			<ErrorBoundary
				fallback={(error) => {
					caught.push(error)
					return <span>boundary</span>
				}}
			>
				<Query query={{ queryKey: ['thrown'], queryFn: () => Promise.reject(boom) }}>{renderValue}</Query>
			</ErrorBoundary>,
		)

		expect(await screen.findByText('boundary')).toBeInTheDocument()
		expect(caught[0]).toBe(boom)
	})

	it('refetches after the boundary resets, rendering loading and then children', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const retry = deferred<string>()
		const queryFn = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('boom'))
			.mockReturnValueOnce(retry.promise)
		renderWithClient(
			<ErrorBoundary
				fallback={(_error, reset) => (
					<button
						type='button'
						onClick={reset}
					>
						reset
					</button>
				)}
			>
				<Query
					query={{ queryKey: ['reset'], queryFn }}
					loading={<span>loading</span>}
				>
					{renderValue}
				</Query>
			</ErrorBoundary>,
		)
		const resetButton = await screen.findByRole('button', { name: 'reset' })

		act(() => {
			resetButton.click()
		})

		expect(await screen.findByText('loading')).toBeInTheDocument()
		await act(async () => {
			retry.resolve('ok')
			await retry.promise
		})
		expect(await screen.findByText('value: ok')).toBeInTheDocument()
		expect(queryFn).toHaveBeenCalledTimes(2)
	})
})
