/* eslint-disable @typescript-eslint/no-deprecated -- Exercise the supported Query v5 API. */
import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { createUser, deleteUser, deleteUsers, updateUser } from '../examples/orval/generated/users'
import { usersSource } from '../examples/orval/source'
import { ApiError } from '../examples/orval/transport'

afterEach(() => vi.unstubAllGlobals())
it('sends prepared grid criteria as query parameters and forwards Query cancellation', async () => {
	const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 })))
	vi.stubGlobal('fetch', fetcher)
	const client = new QueryClient()
	try {
		await client.fetchQuery(
			usersSource.queries.list({
				pagination: { pageIndex: 2, pageSize: 20 },
				sorting: [{ id: 'name', desc: true }],
				columnFilters: [],
				globalFilter: 'Ada & Grace',
			}),
		)
		const call = fetcher.mock.calls[0]
		if (!call) throw new Error('Expected a request')
		const [url, options] = call
		const parsed = new URL(String(url), 'https://example.test')
		expect(parsed.pathname).toBe('/users')
		expect(Object.fromEntries(parsed.searchParams)).toEqual({
			offset: '40',
			limit: '20',
			search: 'Ada & Grace',
			sort: 'name:desc',
		})
		expect(options?.signal).toBeInstanceOf(AbortSignal)
		expect(options?.body).toBeUndefined()
	} finally {
		client.clear()
	}
})
it('sends the next cursor while keeping both pages in one collection cache', async () => {
	const fetcher = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: '1', name: 'Ada' }], next: 'next & page' })))
		.mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: '2', name: 'Grace' }] })))
	vi.stubGlobal('fetch', fetcher)
	const client = new QueryClient()
	const query = usersSource.queries.infinite
	if (!query) throw new Error('Missing infinite source')
	const observer = new InfiniteQueryObserver(
		client,
		query({ pageSize: 20, sorting: [], columnFilters: [], globalFilter: '' }),
	)
	try {
		await observer.refetch()
		await observer.fetchNextPage()
		const url = new URL(String(fetcher.mock.calls[1]?.[0]), 'https://example.test')
		expect(url.searchParams.get('cursor')).toBe('next & page')
		expect(observer.getCurrentResult().data?.pages).toHaveLength(2)
		expect(observer.getCurrentResult().hasNextPage).toBe(false)
		expect(client.getQueryCache().getAll()).toHaveLength(1)
	} finally {
		observer.destroy()
		client.clear()
	}
})
it('lets generated operations place IDs in paths and mutation arguments in JSON bodies', async () => {
	const fetcher = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })))
	vi.stubGlobal('fetch', fetcher)
	await createUser({ name: 'Ada' })
	await updateUser('user-42', { name: 'Grace' })
	await deleteUser('user-42')
	await deleteUsers({ ids: ['user-1', 'user-2'] })
	expect(fetcher.mock.calls.map(([url, options]) => [url, options?.method, options?.body])).toEqual([
		['/users', 'POST', '{"name":"Ada"}'],
		['/users/user-42', 'PATCH', '{"name":"Grace"}'],
		['/users/user-42', 'DELETE', undefined],
		['/users/bulk-delete', 'POST', '{"ids":["user-1","user-2"]}'],
	])
})
it('rejects HTTP failures and preserves JSON or text payloads for error mapping', async () => {
	vi.stubGlobal(
		'fetch',
		vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('{"name":"Already exists"}', { status: 422 }))
			.mockResolvedValueOnce(new Response('Unavailable', { status: 503 })),
	)
	await expect(createUser({ name: 'Ada' })).rejects.toMatchObject({ status: 422, payload: { name: 'Already exists' } })
	await expect(deleteUser('1')).rejects.toEqual(new ApiError(503, 'Unavailable'))
})

it('shares the generated collection request with its grid adapter', async () => {
	const { usersCollection, collectionGridSource } = await import('../examples/orval/collection')
	const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 })))
	vi.stubGlobal('fetch', fetcher)
	const client = new QueryClient()
	try {
		const options = usersCollection.queries.list({ offset: 20, limit: 10, search: 'Ada' })
		await client.fetchQuery(options)
		expect(
			collectionGridSource.getAll?.query({
				pagination: { pageIndex: 2, pageSize: 10 },
				globalFilter: 'Ada',
				sorting: [],
				columnFilters: [],
			}),
		).toMatchObject({ queryKey: options.queryKey })
		const url = new URL(String(fetcher.mock.calls[0]?.[0]), 'https://example.test')
		expect(Object.fromEntries(url.searchParams)).toEqual({ offset: '20', limit: '10', search: 'Ada' })
	} finally {
		client.clear()
	}
})
