import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { deferred } from '../test-kit'

import { createCollectionSourceFactory } from './factory'
import { createCollectionSource } from './source'
import { useCollectionQuery } from './use-collection-query'

import type { ReactNode } from 'react'

function harness() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	return { client, wrapper }
}
const getAll = {
	prepareArgs: (p: { offset: number }) => p,
	fetcher: (p: { offset: number }) => Promise.resolve({ items: [p.offset], total: 4 }),
	getItems: (r: { items: number[]; total: number }) => r.items,
	getTotal: (r: { items: number[]; total: number }) => r.total,
}
describe('collection execution', () => {
	it('shares options with native prefetch and keeps response data in the cache', async () => {
		const { client, wrapper } = harness()
		const source = createCollectionSource({ key: ['numbers'], getAll: { ...getAll, options: { staleTime: Infinity } } })
		await client.query(source.queries.list({ offset: 2 }))
		const { result, rerender, unmount } = renderHook(
			({ offset }) => useCollectionQuery({ source, mode: 'pages', params: { offset } }),
			{ wrapper, initialProps: { offset: 2 } },
		)
		expect(result.current.items).toEqual([2])
		expect(result.current.total).toBe(4)
		expect(client.getQueryData(['numbers', 'list', { offset: 2 }])).toEqual({ items: [2], total: 4 })
		rerender({ offset: 3 })
		await waitFor(() => {
			expect(result.current.items).toEqual([3])
		})
		expect('delete' in result.current).toBe(false)
		unmount()
		client.clear()
	})
	it('prepares inside the mutation, preserves input/context, and returns the fetcher result', async () => {
		const { client, wrapper } = harness()
		const calls: string[] = []
		const source = createCollectionSource({
			key: ['numbers'],
			getAll,
			update: {
				prepareArgs: (input: { value: number }) => {
					calls.push('prepare')
					return input.value
				},
				fetcher: (value: number) => {
					calls.push('fetch')
					return Promise.resolve(value + 1)
				},
				options: {
					onMutate: (input) => {
						calls.push('before')
						return { previous: input.value }
					},
					onSuccess: (data, input, context) => {
						calls.push('success')
						expect(data).toBe(3)
						expect(input).toEqual({ value: 2 })
						expect(context).toEqual({ previous: 2 })
					},
				},
			},
		})
		const { result, unmount } = renderHook(() => useCollectionQuery({ source, mode: 'pages', params: { offset: 0 } }), {
			wrapper,
		})
		await act(async () => {
			expect(await result.current.update.mutateAsync({ value: 2 })).toBe(3)
		})
		expect(calls).toEqual(['before', 'prepare', 'fetch', 'success'])
		unmount()
		client.clear()
	})
	it('routes preparation failures through retry and original-error callbacks', async () => {
		const { client, wrapper } = harness()
		const failure = new Error('invalid')
		const prepare = vi.fn((_input: { id: string }): string => {
			throw failure
		})
		const fetcher = vi.fn((id: string) => Promise.resolve(id))
		const onError = vi.fn()
		const source = createCollectionSource({
			key: ['numbers'],
			getAll,
			delete: {
				prepareArgs: prepare,
				fetcher,
				options: { retry: 1, retryDelay: 0, onMutate: () => 'before', onError },
			},
		})
		const { result, unmount } = renderHook(() => useCollectionQuery({ source, mode: 'pages', params: { offset: 0 } }), {
			wrapper,
		})
		await act(async () => {
			await expect(result.current.delete.mutateAsync({ id: '1' })).rejects.toBe(failure)
		})
		expect(prepare).toHaveBeenCalledTimes(2)
		expect(fetcher).not.toHaveBeenCalled()
		expect(onError.mock.calls[0]?.slice(0, 3)).toEqual([failure, { id: '1' }, 'before'])
		unmount()
		client.clear()
	})
	it('invalidates after unmount without awaiting background refresh', async () => {
		const { client, wrapper } = harness()
		const request = deferred<number>()
		const refresh = deferred<undefined>()
		const invalidate = vi.spyOn(client, 'invalidateQueries').mockReturnValue(refresh.promise)
		const source = createCollectionSource({
			key: ['numbers'],
			getAll,
			deleteMany: {
				prepareArgs: (input: { ids: string[] }) => input.ids,
				fetcher: (_ids: string[]) => request.promise,
			},
		})
		const { result, unmount } = renderHook(() => useCollectionQuery({ source, mode: 'pages', params: { offset: 0 } }), {
			wrapper,
		})
		let pending!: Promise<number>
		act(() => {
			pending = result.current.deleteMany.mutateAsync({ ids: ['1'] })
		})
		unmount()
		request.resolve(1)
		expect(await pending).toBe(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['numbers', 'list'] })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['numbers', 'infinite'] })
		refresh.resolve(undefined)
		client.clear()
	})
	it('supports infinite-only collections and retains items on next-page failure', async () => {
		const { client, wrapper } = harness()
		const source = createCollectionSource({
			key: ['feed'],
			getInfinite: {
				prepareArgs: (p: { topic: string }) => p,
				preparePageArgs: ({ args, pageParam }) => ({ ...args, cursor: pageParam }),
				initialPageParam: 0,
				getNextPageParam: (_page, _all, cursor) => cursor + 1,
				fetcher: (args: { topic: string; cursor: number }) => {
					if (args.cursor) return Promise.reject(new Error('next'))
					return Promise.resolve({ items: [args.topic] })
				},
				getItems: (page) => page.items,
			},
		})
		const { result, unmount } = renderHook(
			() => {
				const collection = useCollectionQuery({ source, mode: 'infinite', params: { topic: 'news' } })
				return { ...collection, failed: collection.query.isFetchNextPageError }
			},
			{ wrapper },
		)
		await waitFor(() => {
			expect(result.current.items).toEqual(['news'])
		})
		await act(async () => {
			await result.current.query.fetchNextPage()
		})
		await waitFor(() => {
			expect(result.current.failed).toBe(true)
		})
		expect(result.current.items).toEqual(['news'])
		expect(result.current.total).toBeUndefined()
		unmount()
		client.clear()
	})
})

it('keeps a dispatched mutation tied to its original source after a rerender', async () => {
	const { client, wrapper } = harness()
	const request = deferred<number>()
	const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
	const makeSource = (team: string) =>
		createCollectionSource({
			key: ['numbers', team],
			getAll,
			update: { prepareArgs: (input: number) => input, fetcher: (_input: number) => request.promise },
		})
	const first = makeSource('first')
	const second = makeSource('second')
	const { result, rerender, unmount } = renderHook(
		({ source }) => useCollectionQuery({ source, mode: 'pages', params: { offset: 0 } }),
		{ wrapper, initialProps: { source: first } },
	)
	let pending!: Promise<number>
	act(() => {
		pending = result.current.update.mutateAsync(1)
	})
	await waitFor(() => {
		expect(client.isMutating()).toBe(1)
	})
	rerender({ source: second })
	request.resolve(2)
	await act(async () => {
		await pending
	})
	expect(invalidate).toHaveBeenCalledWith({ queryKey: ['numbers', 'first', 'list'] })
	expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['numbers', 'second', 'list'] })
	unmount()
	client.clear()
})

it('preserves explicit native and fetcher mutation keys', () => {
	const native = createCollectionSource({
		invalidate: false,
		getAll: {
			query: (_params: { offset: number }) => ({ queryKey: ['external'], queryFn: () => Promise.resolve([1]) }),
			getItems: (items) => items,
		},
		update: { mutation: { mutationKey: ['external-write'], mutationFn: (value: number) => Promise.resolve(value) } },
	})
	expect(native.update.mutation.mutationKey).toEqual(['external-write'])
	const generated = createCollectionSource({
		key: ['generated'],
		getAll,
		update: {
			prepareArgs: (value: number) => value,
			fetcher: (value: number) => Promise.resolve(value),
			options: { mutationKey: ['custom-write'] },
		},
	})
	expect(generated.update.mutation.mutationKey).toEqual(['custom-write'])
})

it('keeps hook order and item references when mutation capabilities change', async () => {
	const { client, wrapper } = harness()
	const read = { ...getAll, options: { staleTime: Infinity } }
	const basic = createCollectionSource({ key: ['capabilities'], getAll: read })
	const editable = createCollectionSource({
		key: ['capabilities'],
		getAll: read,
		update: {
			prepareArgs: (input: number) => input,
			fetcher: (input: number) => Promise.resolve(input),
		},
	})
	const { result, rerender, unmount } = renderHook(
		({ source }) => useCollectionQuery({ source, mode: 'pages', params: { offset: 0 } }),
		{ wrapper, initialProps: { source: basic } },
	)
	await waitFor(() => {
		expect(result.current.items).toEqual([0])
	})
	const items = result.current.items
	rerender({ source: basic })
	expect(result.current.items).toBe(items)
	rerender({ source: editable })
	expect('update' in result.current).toBe(true)
	rerender({ source: basic })
	expect('update' in result.current).toBe(false)
	unmount()
	client.clear()
})

it('forwards signals, respects disabled reads and projects selected data without changing the cache', async () => {
	const { client, wrapper } = harness()
	const fetcher = vi.fn((_args: { tenant: string }, transport: { signal: AbortSignal }) => {
		expect(transport.signal).toBeInstanceOf(AbortSignal)
		return Promise.resolve({ items: [1, 2] })
	})
	const make = (enabled: boolean) =>
		createCollectionSource({
			key: ['selected-runtime'],
			getAll: {
				prepareArgs: (params: { tenant: string }) => params,
				fetcher,
				options: { enabled, select: (response) => response.items.map(String) },
				getItems: (items) => items,
			},
		})
	const { result, rerender, unmount } = renderHook(
		({ enabled }) => {
			const collection = useCollectionQuery({ source: make(enabled), mode: 'pages', params: { tenant: 'a' } })
			return { ...collection, fetchStatus: collection.query.fetchStatus }
		},
		{ wrapper, initialProps: { enabled: false } },
	)
	expect(result.current.fetchStatus).toBe('idle')
	expect(fetcher).not.toHaveBeenCalled()
	rerender({ enabled: true })
	await waitFor(() => {
		expect(result.current.items).toEqual(['1', '2'])
	})
	expect(client.getQueryData(['selected-runtime', 'list', { tenant: 'a' }])).toEqual({ items: [1, 2] })
	expect(make(true).queries.list({ tenant: 'a' }).queryKey).not.toEqual(
		make(true).queries.list({ tenant: 'b' }).queryKey,
	)
	unmount()
	client.clear()
})

it('applies shared conventions and replaces supplied options as a whole', async () => {
	const make = createCollectionSourceFactory({
		list: {
			prepareArgs: (params: { page: number }) => ({ offset: params.page * 10 }),
			getItems: (response: { items: number[] }) => response.items,
			options: { enabled: false, staleTime: 123 },
		},
		mutations: { update: { prepareArgs: (input: { id: string }) => ({ id: input.id }) } },
	})
	const fetcher = vi.fn((input: number) => Promise.resolve(input))
	const source = make({
		key: ['factory'],
		getAll: {
			fetcher: (args: { offset: number }) => Promise.resolve({ items: [args.offset] }),
			options: { staleTime: Infinity },
		},
		update: { prepareArgs: (input: { number: number }) => input.number, fetcher },
	})
	expect(source.queries.list({ page: 2 }).enabled).toBeUndefined()
	const { client, wrapper } = harness()
	const { result, unmount } = renderHook(() => useCollectionQuery({ source, mode: 'pages', params: { page: 2 } }), {
		wrapper,
	})
	await waitFor(() => {
		expect(result.current.items).toEqual([20])
	})
	await act(async () => {
		expect(await result.current.update.mutateAsync({ number: 42 })).toBe(42)
	})
	expect(fetcher).toHaveBeenCalledWith(42)
	unmount()
	client.clear()
})
