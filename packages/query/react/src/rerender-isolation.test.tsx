import { act, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Query } from './query'
import { deferred, renderWithClient } from './test-kit'

import type { ReactNode } from 'react'

describe('Query — subscription isolation', () => {
	it('re-renders only the gate whose query changed, not its sibling or parent', async () => {
		const renders = { parent: 0, first: 0, second: 0 }
		function Parent(): ReactNode {
			renders.parent += 1
			return (
				<>
					<Query query={{ queryKey: ['first'], queryFn: () => Promise.resolve('a') }}>
						{(value) => {
							renders.first += 1
							return <span>first: {value}</span>
						}}
					</Query>
					<Query query={{ queryKey: ['second'], queryFn: () => Promise.resolve('b') }}>
						{(value) => {
							renders.second += 1
							return <span>second: {value}</span>
						}}
					</Query>
				</>
			)
		}
		const { client } = renderWithClient(<Parent />)
		await screen.findByText('first: a')
		await screen.findByText('second: b')
		const before = { ...renders }

		act(() => {
			client.setQueryData(['first'], 'a2')
		})

		expect(await screen.findByText('first: a2')).toBeInTheDocument()
		expect(renders.first).toBeGreaterThan(before.first)
		expect(renders.second).toBe(before.second)
		expect(renders.parent).toBe(before.parent)
	})

	it('never re-renders the parent through loading, data and a background refetch', async () => {
		const first = deferred<string>()
		const second = deferred<string>()
		const queryFn = vi
			.fn<() => Promise<string>>()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise)
		let parentRenders = 0
		function Parent(): ReactNode {
			parentRenders += 1
			return (
				<Query
					query={{ queryKey: ['path'], queryFn }}
					loading={<span>loading</span>}
				>
					{(value, q) => (
						<span>
							value: {value} fetching: {String(q.isFetching)}
						</span>
					)}
				</Query>
			)
		}
		const { client } = renderWithClient(<Parent />)
		expect(screen.getByText('loading')).toBeInTheDocument()

		await act(async () => {
			first.resolve('one')
			await first.promise
		})
		await screen.findByText('value: one fetching: false')
		act(() => {
			void client.refetchQueries({ queryKey: ['path'] })
		})
		await screen.findByText('value: one fetching: true')
		await act(async () => {
			second.resolve('two')
			await second.promise
		})

		expect(await screen.findByText('value: two fetching: false')).toBeInTheDocument()
		expect(parentRenders).toBe(1)
	})
})
