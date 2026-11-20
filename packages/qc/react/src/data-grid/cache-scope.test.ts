/* eslint-disable @typescript-eslint/no-deprecated -- Verify APIs available throughout the supported Query v5 peer range. */
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory } from './factory'
import { listInvalidation, resolveInvalidation } from './invalidation'

import type { GridQueryParams } from './types'

const params: GridQueryParams = {
	pagination: { pageIndex: 0, pageSize: 10 },
	sorting: [],
	columnFilters: [],
	globalFilter: '',
}
type User = { id: string }
it('isolates prepared tenant scope and every applied query axis in the cache', async () => {
	const client = new QueryClient()
	const fetcher = vi.fn(() => Promise.resolve([{ id: '1' }]))
	function source(tenant: string) {
		return createGridSourceFactory({
			list: {
				prepareArgs: (query) => ({ tenant, ...query }),
				getRows: (rows: User[]) => rows,
				options: { staleTime: Infinity },
			},
		})({ key: ['users'], getAll: fetcher })
	}
	const first = source('a')
	const variants: GridQueryParams[] = [
		params,
		{ ...params, pagination: { pageIndex: 1, pageSize: 10 } },
		{ ...params, pagination: { pageIndex: 0, pageSize: 20 } },
		{ ...params, sorting: [{ id: 'name', desc: true }] },
		{ ...params, columnFilters: [{ id: 'name', value: 'Ada' }] },
		{ ...params, globalFilter: 'Ada' },
	]
	for (const variant of variants) await client.fetchQuery(first.queries.list(variant))
	await client.fetchQuery(source('b').queries.list(params))
	await client.fetchQuery(first.queries.list({ ...params, pagination: { pageSize: 10, pageIndex: 0 } }))
	expect(fetcher).toHaveBeenCalledTimes(7)
	expect(client.getQueryCache().getAll()).toHaveLength(7)
	client.clear()
})

it('refetches active lists, marks inactive lists stale and honors refetchType', async () => {
	const client = new QueryClient()
	const active = vi.fn(() => Promise.resolve('active'))
	const inactive = vi.fn(() => Promise.resolve('inactive'))
	const activeOptions = { queryKey: ['a', 'users', 'list'], queryFn: active, staleTime: Infinity }
	const inactiveOptions = { queryKey: ['a', 'users', 'infinite'], queryFn: inactive, staleTime: Infinity }
	await client.fetchQuery(activeOptions)
	await client.fetchQuery(inactiveOptions)
	client.setQueryData(['b', 'users', 'list'], 'other tenant')
	client.setQueryData(['a', 'users', 'detail', '1'], 'detail')
	const observer = new QueryObserver(client, activeOptions)
	const unsubscribe = observer.subscribe(() => {})
	await Promise.all(listInvalidation(['a', 'users']).map((filter) => client.invalidateQueries(filter)))
	expect(active).toHaveBeenCalledTimes(2)
	expect(inactive).toHaveBeenCalledTimes(1)
	expect(client.getQueryState(inactiveOptions.queryKey)?.isInvalidated).toBe(true)
	expect(client.getQueryState(['b', 'users', 'list'])?.isInvalidated).toBe(false)
	expect(client.getQueryState(['a', 'users', 'detail', '1'])?.isInvalidated).toBe(false)
	await Promise.all(
		resolveInvalidation([], { replace: [{ queryKey: ['a', 'users', 'infinite'], refetchType: 'all' }] }).map((filter) =>
			client.invalidateQueries(filter),
		),
	)
	expect(inactive).toHaveBeenCalledTimes(2)
	unsubscribe()
	observer.destroy()
	client.clear()
})
