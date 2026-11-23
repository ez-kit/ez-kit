import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { deferred } from '../test-kit'

import { createCollectionSource } from './testing/source.fixture'
import { useCollectionQuery } from './testing/use-collection-query.fixture'

import type { ReactNode } from 'react'

function harness() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	return { client, wrapper }
}
const getAll = { prepareArgs: () => undefined, fetcher: () => Promise.resolve([1]), getItems: (data: number[]) => data }

describe('pending collection ownership', () => {
	it.each(['native', 'generated'] as const)(
		'retains %s operation lifecycle when its capability disappears',
		async (kind) => {
			const { client, wrapper } = harness()
			const pending = deferred<number>()
			const onSuccess = vi.fn()
			const onSettled = vi.fn()
			const invalidate = vi.spyOn(client, 'invalidateQueries')
			const fetcher = (_input: number) => pending.promise
			const original = createCollectionSource({
				key: ['A'],
				getAll,
				update:
					kind === 'native'
						? { mutation: { mutationFn: fetcher, onSuccess, onSettled } }
						: { prepareArgs: (input: number) => input, fetcher, options: { onSuccess, onSettled } },
			})
			const absent = createCollectionSource({ key: ['B'], getAll })
			type OptionalSource = typeof absent & { update?: typeof original.update }
			const hook = renderHook(
				({ present }) =>
					useCollectionQuery<OptionalSource, 'pages'>({
						source: present ? original : absent,
						mode: 'pages',
						params: undefined,
					}),
				{ wrapper, initialProps: { present: true } },
			)
			let completion: Promise<number> | undefined
			act(() => {
				completion = hook.result.current.update?.mutateAsync(7)
			})
			await waitFor(() => {
				expect(hook.result.current.update?.isPending).toBe(true)
			})
			hook.rerender({ present: false })
			expect(hook.result.current.update).toBeUndefined()
			await act(async () => {
				pending.resolve(7)
				await completion
			})
			expect(onSuccess).toHaveBeenCalledTimes(1)
			expect(onSettled).toHaveBeenCalledTimes(1)
			expect(invalidate.mock.calls.map(([filter]) => filter?.queryKey)).toEqual([
				['A', 'list'],
				['A', 'infinite'],
			])
			hook.unmount()
			client.clear()
		},
	)
	it.each(['native', 'generated'] as const)('retains %s retries when its capability disappears', async (kind) => {
		const { client, wrapper } = harness()
		const pending = deferred<number>()
		const fetcher = vi.fn((_input: number) => Promise.resolve(9)).mockImplementationOnce(() => pending.promise)
		const onSuccess = vi.fn()
		const options = { retry: 1, retryDelay: 0, onSuccess }
		const original = createCollectionSource({
			key: ['A'],
			getAll,
			update:
				kind === 'native'
					? { mutation: { mutationFn: fetcher, ...options } }
					: { prepareArgs: (input: number) => input, fetcher, options },
		})
		const absent = createCollectionSource({ key: ['B'], getAll })
		type OptionalSource = typeof absent & { update?: typeof original.update }
		const hook = renderHook(
			({ present }) =>
				useCollectionQuery<OptionalSource, 'pages'>({
					source: present ? original : absent,
					mode: 'pages',
					params: undefined,
				}),
			{ wrapper, initialProps: { present: true } },
		)
		let completion: Promise<number> | undefined
		act(() => {
			completion = hook.result.current.update?.mutateAsync(7)
		})
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledTimes(1)
		})
		hook.rerender({ present: false })
		await act(async () => {
			pending.reject(new Error('retry'))
			expect(await completion).toBe(9)
		})
		expect(fetcher.mock.calls.map(([input]) => input)).toEqual([7, 7])
		expect(onSuccess).toHaveBeenCalledTimes(1)
		hook.unmount()
		client.clear()
	})
	it('keeps mixed-source retries, callbacks and invalidation in the original scope', async () => {
		const { client, wrapper } = harness()
		const pending = deferred<number>()
		const fetchA = vi.fn((_input: number) => Promise.resolve(9)).mockImplementationOnce(() => pending.promise)
		const fetchB = vi.fn((_input: number) => Promise.resolve(2))
		const successA = vi.fn(),
			successB = vi.fn()
		const invalidate = vi.spyOn(client, 'invalidateQueries')
		const make = (tenant: string, fetcher: (input: number) => Promise<number>, onSuccess: () => void) =>
			createCollectionSource({
				key: [tenant],
				invalidate: { replace: [{ queryKey: ['native', tenant] }] },
				getAll: {
					query: () => ({ queryKey: ['native', tenant], queryFn: () => Promise.resolve([1]) }),
					getItems: (data: number[]) => data,
				},
				update: { prepareArgs: (input: number) => input, fetcher, options: { retry: 1, retryDelay: 0, onSuccess } },
			})
		const A = make('A', fetchA, successA),
			B = make('B', fetchB, successB)
		const hook = renderHook(({ source }) => useCollectionQuery({ source, mode: 'pages', params: undefined }), {
			wrapper,
			initialProps: { source: A },
		})
		let completion: Promise<number> | undefined
		act(() => {
			completion = hook.result.current.update.mutateAsync(7)
		})
		await waitFor(() => {
			expect(fetchA).toHaveBeenCalledTimes(1)
		})
		hook.rerender({ source: B })
		await act(async () => {
			pending.reject(new Error('retry'))
			expect(await completion).toBe(9)
		})
		expect(fetchA.mock.calls).toEqual([[7], [7]])
		expect(fetchB).not.toHaveBeenCalled()
		expect(successA).toHaveBeenCalledTimes(1)
		expect(successB).not.toHaveBeenCalled()
		expect(invalidate.mock.calls.map(([filter]) => filter?.queryKey)).toEqual([['native', 'A']])
		hook.unmount()
		client.clear()
	})
	it('rejects a mixed fetcher mutation without a base key for untyped callers', () => {
		const config = {
			invalidate: false as const,
			getAll: {
				query: () => ({ queryKey: ['native'], queryFn: () => Promise.resolve([1]) }),
				getItems: (data: number[]) => data,
			},
			update: { prepareArgs: (id: number) => id, fetcher: (id: number) => Promise.resolve(id) },
		}
		expect(() => {
			// @ts-expect-error generated mutations require ownership identity even with native reads
			createCollectionSource(config)
		}).toThrow('Fetcher sources require a collection key')
	})
})
