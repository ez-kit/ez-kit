import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Query } from './query'
import { ErrorBoundary, renderWithClient } from './test-kit'

import type { ReactNode } from 'react'

afterEach(() => {
	vi.restoreAllMocks()
})

/**
 * The docs recipe for reading a gate's data further down the tree: a descendant calls TanStack's
 * own `useSuspenseQuery` with the gate's `queryOptions`. These tests hold the claims the docs make
 * about it, which come from TanStack rather than from this package.
 */
describe('useSuspenseQuery under the gate', () => {
	it('reads the data without suspending and without a second request', async () => {
		const queryFn = vi.fn(() => Promise.resolve(['gateway', 'sensor']))
		const options = queryOptions({ queryKey: ['devices'], queryFn })
		function Count(): ReactNode {
			const { data } = useSuspenseQuery(options)
			return <span>count: {data.length}</span>
		}

		renderWithClient(
			<Suspense fallback={<span>suspended</span>}>
				<Query query={options}>{() => <Count />}</Query>
			</Suspense>,
		)

		expect(await screen.findByText('count: 2')).toBeInTheDocument()
		expect(screen.queryByText('suspended')).not.toBeInTheDocument()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	it('keeps the data when a background refetch fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const queryFn = vi
			.fn<() => Promise<string[]>>()
			.mockResolvedValueOnce(['gateway'])
			.mockRejectedValueOnce(new Error('boom'))
		const options = queryOptions({ queryKey: ['devices'], queryFn })
		function Count(): ReactNode {
			const { data } = useSuspenseQuery(options)
			return <span>count: {data.length}</span>
		}
		const { client } = renderWithClient(
			<ErrorBoundary fallback={() => <span>boundary</span>}>
				<Query query={options}>{() => <Count />}</Query>
			</ErrorBoundary>,
		)
		await screen.findByText('count: 1')

		await act(async () => {
			await client.refetchQueries({ queryKey: ['devices'] })
		})

		expect(client.getQueryState(['devices'])?.status).toBe('error')
		expect(screen.getByText('count: 1')).toBeInTheDocument()
		expect(screen.queryByText('boundary')).not.toBeInTheDocument()
	})
})
