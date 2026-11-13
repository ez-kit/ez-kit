/* eslint-disable @typescript-eslint/no-deprecated -- Verify APIs available throughout the supported Query v5 peer range. */
import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createInfiniteSource } from './infinite-source'

import type { GridInfiniteParams } from './types'

const params: GridInfiniteParams = { pageSize: 20, sorting: [], columnFilters: [], globalFilter: 'Ada' }
type Request = { body: { search: string; continuation: string | null } }
type User = { id: string }
type Page = { items: User[]; next: string | null }

describe('infinite source', () => {
	it('puts cursor in the DTO without changing collection identity or mutating its arguments', async () => {
		const fetcher = vi.fn((args: Request, _transport: { signal: AbortSignal }): Promise<Page> =>
			Promise.resolve({
				items: [{ id: args.body.continuation ?? 'first' }],
				next: args.body.continuation === null ? 'second' : null,
			}),
		)
		const source = createInfiniteSource({
			key: ['users'],
			fetcher,
			prepareArgs: ({ globalFilter }) => ({ body: { search: String(globalFilter) } }),
			preparePageArgs: ({ args, pageParam }) => ({ body: { ...args.body, continuation: pageParam } }),
			initialPageParam: null as string | null,
			getNextPageParam: (page) => page.next ?? undefined,
			getRows: (page) => page.items,
		})
		const client = new QueryClient()
		const options = source.query(params)
		const observer = new InfiniteQueryObserver(client, options)
		await observer.refetch()
		await observer.fetchNextPage()
		const result = observer.getCurrentResult()
		expect(result.data?.pages.map((page) => page.items)).toEqual([[{ id: 'first' }], [{ id: 'second' }]])
		expectTypeOf(result.data?.pages[0]).toEqualTypeOf<Page | undefined>()
		expect(result.hasNextPage).toBe(false)
		expect(options.queryKey).toEqual(['users', 'infinite', { body: { search: 'Ada' } }])
		expect(client.getQueryCache().getAll()).toHaveLength(1)
		expect(fetcher.mock.calls.map(([args]) => args.body.continuation)).toEqual([null, 'second'])
		expect(fetcher.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal)
		observer.destroy()
		client.clear()
	})
	it('projects selected pages without replacing the original cached response', async () => {
		const source = createInfiniteSource({
			key: ['users'],
			fetcher: (_args: Request): Promise<Page> => Promise.resolve({ items: [{ id: '1' }], next: null }),
			prepareArgs: () => ({ body: { search: 'Ada' } }),
			preparePageArgs: ({ args, pageParam }) => ({ body: { ...args.body, continuation: pageParam } }),
			initialPageParam: null as string | null,
			getNextPageParam: (page) => page.next ?? undefined,
			options: { select: (data) => ({ ...data, pages: data.pages.map((page) => page.items) }) },
			getRows: (page: User[]) => page,
		})
		const client = new QueryClient()
		const options = source.query(params)
		const observer = new InfiniteQueryObserver(client, options)
		await observer.refetch()
		const data = observer.getCurrentResult().data
		expectTypeOf(data?.pages[0]).toEqualTypeOf<User[] | undefined>()
		expect(data?.pages).toEqual([[{ id: '1' }]])
		expect(client.getQueryData(options.queryKey)).toEqual({
			pages: [{ items: [{ id: '1' }], next: null }],
			pageParams: [null],
		})
		observer.destroy()
		client.clear()
	})

	it('separates collections by prepared criteria and forwards query cancellation', async () => {
		let requestSignal: AbortSignal | undefined
		const source = createInfiniteSource({
			key: ['tenant', 'a', 'users'],
			fetcher: (_args: Request, { signal }: { signal: AbortSignal }) =>
				new Promise<Page>((_resolve, reject) => {
					requestSignal = signal
					signal.addEventListener('abort', () => {
						reject(new Error('aborted'))
					})
				}),
			prepareArgs: ({ globalFilter }) => ({ body: { search: String(globalFilter) } }),
			preparePageArgs: ({ args, pageParam }) => ({ body: { ...args.body, continuation: pageParam } }),
			initialPageParam: null as string | null,
			getNextPageParam: (page) => page.next ?? undefined,
			getRows: (page) => page.items,
		})
		const client = new QueryClient()
		const options = source.query(params)
		expect(source.query({ ...params, globalFilter: 'Grace' }).queryKey).not.toEqual(options.queryKey)
		const observer = new InfiniteQueryObserver(client, options)
		const pending = observer.refetch()
		await client.cancelQueries({ queryKey: options.queryKey })
		await pending
		expect(requestSignal?.aborted).toBe(true)
		expect(client.getQueryData(options.queryKey)).toBeUndefined()
		observer.destroy()
		client.clear()
	})
})

it('separates tenants and collection criteria while retaining pages under one collection key', async () => {
	const client = new QueryClient()
	const fetcher = vi.fn((_args: { tenant: string; criteria: GridInfiniteParams; cursor: string | null }) =>
		Promise.resolve({ items: [{ id: '1' }], next: null }),
	)
	function make(tenant: string) {
		return createInfiniteSource({
			key: ['users'],
			fetcher,
			prepareArgs: (criteria: GridInfiniteParams) => ({ tenant, criteria }),
			preparePageArgs: ({ args, pageParam }) => ({ ...args, cursor: pageParam }),
			initialPageParam: null as string | null,
			getNextPageParam: () => null,
			getRows: (page) => page.items,
			options: { staleTime: Infinity },
		})
	}
	const source = make('a')
	for (const criteria of [
		params,
		{ ...params, pageSize: 50 },
		{ ...params, globalFilter: 'Grace' },
		{ ...params, sorting: [{ id: 'name', desc: true }] },
		{ ...params, columnFilters: [{ id: 'role', value: 'admin' }] },
	]) {
		await client.fetchInfiniteQuery(source.query(criteria))
	}
	await client.fetchInfiniteQuery(make('b').query(params))
	await client.fetchInfiniteQuery(source.query({ ...params }))
	expect(fetcher).toHaveBeenCalledTimes(6)
	expect(client.getQueryCache().getAll()).toHaveLength(6)
	client.clear()
})
