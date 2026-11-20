/* eslint-disable @typescript-eslint/no-deprecated -- Verify the Query v5 APIs supported by the package peer range. */
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createListSource } from './list-source'

import type { GridQueryParams } from './types'

const params: GridQueryParams = {
	pagination: { pageIndex: 2, pageSize: 20 },
	sorting: [],
	columnFilters: [],
	globalFilter: undefined,
}

type User = { id: string; name: string }
type Response = { items: User[]; total: number }
const response: Response = { items: [{ id: 'u1', name: 'Ada' }], total: 41 }

describe('fetcher list sources', () => {
	it('uses prepared arguments for the key and shares prefetch cache with native consumers', async () => {
		const fetcher = vi.fn((_args: { offset: number; limit: number }, _transport: { signal: AbortSignal }) =>
			Promise.resolve(response),
		)
		const source = createListSource({
			key: ['users'],
			fetcher,
			prepareArgs: ({ pagination }) => ({
				offset: pagination.pageIndex * pagination.pageSize,
				limit: pagination.pageSize,
			}),
			getRows: (data) => data.items,
			getRowCount: (data) => data.total,
			options: { staleTime: Infinity },
		})
		const client = new QueryClient()
		await client.prefetchQuery(source.query(params))
		const data = await client.fetchQuery(source.query(params))
		expect(data).toEqual(response)
		expectTypeOf(data).toEqualTypeOf<Response>()
		expectTypeOf(source.getRows(data)).toEqualTypeOf<readonly User[]>()
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(fetcher.mock.calls[0]?.[0]).toEqual({ offset: 40, limit: 20 })
		expect(fetcher.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal)
		expect(source.query(params).queryKey).toEqual(['users', 'list', { offset: 40, limit: 20 }])
		expect(source.getRowCount?.(data)).toBe(41)
		client.clear()
	})

	it('projects the selected response without changing cached fetcher data', async () => {
		const source = createListSource({
			key: ['users'],
			fetcher: (_args: { limit: number }) => Promise.resolve(response),
			prepareArgs: () => ({ limit: 20 }),
			options: { select: (data) => data.items },
			getRows: (users) => users,
		})
		const client = new QueryClient()
		const data = await client.fetchQuery(source.query(params))
		expect(data).toEqual(response)
		expectTypeOf(source.getRows).parameter(0).toEqualTypeOf<User[]>()
		client.clear()
	})
})

// Type fixtures are checked by tsc, without executing an invalid request.
function invalidPreparedArguments() {
	createListSource({
		key: ['users'],
		fetcher: (_args: { id: number }) => Promise.resolve(response),
		// @ts-expect-error The fetcher's ID type cannot be widened by prepareArgs.
		prepareArgs: () => ({ id: 'wrong' }),
		getRows: (data) => data.items,
	})
}
void invalidPreparedArguments
