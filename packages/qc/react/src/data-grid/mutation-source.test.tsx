import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createGridSourceFactory } from './factory'
import { useGridMutation } from './mutation-source'

import type { ReactNode } from 'react'

function harness() {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	return { client, wrapper }
}

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}

describe('grid mutation lifecycle', () => {
	it('invalidates after unmount and does not wait for automatic refresh', async () => {
		const { client, wrapper } = harness()
		const request = deferred<string>()
		const refresh = deferred<undefined>()
		const invalidate = vi.spyOn(client, 'invalidateQueries').mockReturnValue(refresh.promise)
		const success = vi.fn()
		const { result, unmount } = renderHook(
			() =>
				useGridMutation(
					{
						mutation: { mutationFn: (_id: string) => request.promise, onSuccess: success },
						prepareArgs: (input: { id: string }) => input.id,
					},
					[{ queryKey: ['users', 'list'] }],
				),
			{ wrapper },
		)
		let completion!: Promise<void>
		act(() => {
			completion = result.current.execute({ id: 'u1' })
		})
		unmount()
		request.resolve('saved')
		await completion
		expect(success).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users', 'list'] })
		refresh.resolve(undefined)
		client.clear()
	})

	it('preserves the original onError and transforms only the grid-facing rejection', async () => {
		const { client, wrapper } = harness()
		const original = new Error('API validation')
		const transformed = new Error('grid validation')
		const onError = vi.fn((_error: unknown) => {})
		const invalidate = vi.spyOn(client, 'invalidateQueries')
		const { result, unmount } = renderHook(
			() =>
				useGridMutation(
					{
						mutation: {
							mutationFn: (_id: string) => Promise.reject(original),
							onError,
						},
						prepareArgs: (input: { id: string }) => input.id,
						transformError: () => transformed,
					},
					[{ queryKey: ['users'] }],
				),
			{ wrapper },
		)
		await act(async () => {
			await expect(result.current.execute({ id: 'u1' })).rejects.toBe(transformed)
		})
		expect(onError.mock.calls[0]?.[0]).toBe(original)
		expect(invalidate).not.toHaveBeenCalled()
		unmount()
		client.clear()
	})

	it('awaits user lifecycle and retains optimistic context even if onSuccess throws', async () => {
		const { client, wrapper } = harness()
		const callback = deferred<undefined>()
		const callbackFailure = new Error('callback failed')
		const invalidate = vi.spyOn(client, 'invalidateQueries')
		const onSuccess = vi.fn((_data: string, _variables: string, optimistic: { before: string } | undefined) => {
			expect(optimistic).toEqual({ before: 'old' })
			return callback.promise
		})
		const { result, unmount } = renderHook(
			() =>
				useGridMutation(
					{
						mutation: {
							mutationFn: (id: string) => Promise.resolve(id),
							onMutate: () => ({ before: 'old' }),
							onSuccess,
						},
						prepareArgs: (id: string) => id,
					},
					[{ queryKey: ['users'] }],
				),
			{ wrapper },
		)
		let completion!: Promise<void>
		act(() => {
			completion = result.current.execute('u1')
		})
		const failure = expect(completion).rejects.toBe(callbackFailure)
		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalledTimes(1)
		})
		expect(invalidate).not.toHaveBeenCalled()
		await act(async () => {
			callback.reject(callbackFailure)
			await failure
		})
		expect(invalidate).toHaveBeenCalledTimes(1)
		unmount()
		client.clear()
	})
})

it('isolates synchronous filter failures and rejected refreshes from persistence', async () => {
	const { client, wrapper } = harness()
	client.setQueryData(['users'], [])
	client.setQueryData(['count'], 1)
	const failedRefresh = deferred<undefined>()
	const original = client.invalidateQueries.bind(client)
	const invalidate = vi.spyOn(client, 'invalidateQueries')
	invalidate.mockImplementation((filter, options) =>
		filter?.queryKey?.[0] === 'refresh' ? failedRefresh.promise : original(filter, options),
	)
	const onError = vi.fn((_error: unknown) => {})
	const { result, unmount } = renderHook(
		() =>
			useGridMutation(
				{
					mutation: { mutationFn: (id: string) => Promise.resolve(id), onError },
					prepareArgs: (id: string) => id,
				},
				[
					{
						predicate: () => {
							throw new Error('Broken application predicate')
						},
					},
					{ queryKey: ['refresh'] },
					{ queryKey: ['count'] },
				],
			),
		{ wrapper },
	)
	await act(async () => {
		await result.current.execute('1')
	})
	expect(invalidate).toHaveBeenCalledTimes(3)
	expect(client.getQueryState(['count'])?.isInvalidated).toBe(true)
	act(() => {
		failedRefresh.reject(new Error('Offline'))
	})
	await failedRefresh.promise.catch(() => undefined)
	expect(onError).not.toHaveBeenCalled()
	expect(result.current.mutation.isError).toBe(false)
	unmount()
	client.clear()
})

it('awaits onMutate, onSuccess and onSettled with the native optimistic context', async () => {
	const { client, wrapper } = harness()
	const before = deferred<{ previous: string }>()
	const success = deferred<undefined>()
	const settled = deferred<undefined>()
	const mutationFn = vi.fn((id: string) => Promise.resolve(id))
	const onSuccess = vi.fn(() => success.promise)
	const onSettled = vi.fn(() => settled.promise)
	const invalidate = vi.spyOn(client, 'invalidateQueries')
	const { result, unmount } = renderHook(
		() =>
			useGridMutation(
				{
					mutation: { mutationFn, onMutate: () => before.promise, onSuccess, onSettled },
					prepareArgs: (id: string) => id,
				},
				[{ queryKey: ['users'] }],
			),
		{ wrapper },
	)
	let finished = false
	let completion!: Promise<void>
	act(() => {
		completion = result.current.execute('1').then(() => {
			finished = true
		})
	})
	expect(mutationFn).not.toHaveBeenCalled()
	await act(async () => {
		before.resolve({ previous: 'Ada' })
		await before.promise
	})
	await waitFor(() => {
		expect(onSuccess).toHaveBeenCalledTimes(1)
	})
	expect(invalidate).not.toHaveBeenCalled()
	expect(finished).toBe(false)
	await act(async () => {
		success.resolve(undefined)
		await success.promise
	})
	await waitFor(() => {
		expect(onSettled).toHaveBeenCalledTimes(1)
	})
	expect(onSettled).toHaveBeenCalledWith('1', null, '1', { previous: 'Ada' }, expect.anything())
	expect(invalidate).toHaveBeenCalledTimes(1)
	expect(finished).toBe(false)
	await act(async () => {
		settled.resolve(undefined)
		await completion
	})
	expect(finished).toBe(true)
	unmount()
	client.clear()
})

it.each([
	{ label: 'inherited', operation: undefined, expected: ['list', 'count'] },
	{ label: 'disabled', operation: false as const, expected: [] },
	{ label: 'additional', operation: { additional: [{ queryKey: ['audit'] }] }, expected: ['list', 'count', 'audit'] },
	{ label: 'replace', operation: { replace: [{ queryKey: ['audit'] }] }, expected: ['audit'] },
])('$label operation policy applies to real cache entries after success', async ({ operation, expected }) => {
	const { client, wrapper } = harness()
	for (const key of ['list', 'count', 'audit']) client.setQueryData([key], [])
	const { result, unmount } = renderHook(
		() =>
			useGridMutation(
				{
					mutation: { mutationFn: (id: string) => Promise.resolve(id) },
					prepareArgs: (id: string) => id,
					...(operation === undefined ? {} : { invalidate: operation }),
				},
				[{ queryKey: ['list'] }, { queryKey: ['count'] }],
			),
		{ wrapper },
	)
	await act(async () => {
		await result.current.execute('1')
	})
	expect(['list', 'count', 'audit'].filter((key) => client.getQueryState([key])?.isInvalidated)).toEqual(expected)
	unmount()
	client.clear()
})

it('lets operation error mapping replace inherited mapping and preserves unknown errors by default', async () => {
	const { client, wrapper } = harness()
	const original = { status: 422, fields: { name: ['Already used'] } }
	const inherited = vi.fn(() => new Error('inherited'))
	const operation = vi.fn(() => new Error('operation'))
	const onError = vi.fn((_error: unknown) => {})
	const { result, rerender, unmount } = renderHook(
		({ mapping }: { mapping: 'operation' | 'inherited' | 'none' }) =>
			useGridMutation(
				{
					mutation: {
						// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- API clients can reject with non-Error payloads; preserve them unchanged.
						mutationFn: (_id: string) => Promise.reject(original),
						onError,
					},
					prepareArgs: (id: string) => id,
					...(mapping === 'operation' ? { transformError: operation } : {}),
				},
				[],
				mapping === 'none' ? undefined : inherited,
			),
		{ wrapper, initialProps: { mapping: 'operation' as 'operation' | 'inherited' | 'none' } },
	)
	await act(async () => {
		await expect(result.current.execute('1')).rejects.toThrow('operation')
	})
	expect(inherited).not.toHaveBeenCalled()
	rerender({ mapping: 'inherited' })
	await act(async () => {
		await expect(result.current.execute('1')).rejects.toThrow('inherited')
	})
	rerender({ mapping: 'none' })
	await act(async () => {
		await expect(result.current.execute('1')).rejects.toBe(original)
	})
	expect(onError.mock.calls.map((args) => args[0])).toEqual([original, original, original])
	unmount()
	client.clear()
})

it.each(['success', 'error', 'retry'] as const)(
	'keeps grid factory mutation %s in the original tenant',
	async (outcome) => {
		const { client, wrapper } = harness()
		const firstRequest = deferred<string>()
		const events: string[] = []
		const firstFetcher = vi.fn((_id: string) => firstRequest.promise)
		if (outcome === 'retry')
			firstFetcher.mockImplementationOnce(() => firstRequest.promise).mockResolvedValue('retried')
		const secondFetcher = vi.fn((id: string) => Promise.resolve(id))
		const makeSource = createGridSourceFactory({
			list: { prepareArgs: () => ({}), getRows: (rows: { id: string }[]) => rows },
		})
		const makeTenant = (tenant: string, fetcher: (id: string) => Promise<string>) =>
			makeSource({
				key: ['users', tenant],
				getAll: () => Promise.resolve([{ id: 'one' }]),
				update: {
					prepareArgs: ({ rowId }) => rowId,
					fetcher,
					options: {
						retry: outcome === 'retry' ? 1 : false,
						retryDelay: 0,
						onSuccess: () => {
							events.push(`success-${tenant}`)
						},
						onError: () => {
							events.push(`error-${tenant}`)
						},
					},
				},
			})
		const first = makeTenant('a', firstFetcher)
		const second = makeTenant('b', secondFetcher)
		expect(first.update?.mutation.mutationKey).toEqual(['users', 'a', 'update'])
		const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
		const { result, rerender, unmount } = renderHook(
			({ source }) => {
				if (!source.update) throw new Error('Missing update')
				return useGridMutation(source.update, source.invalidation)
			},
			{ wrapper, initialProps: { source: first } },
		)
		let completion!: Promise<void>
		act(() => {
			completion = result.current.execute({ rowId: 'a-user', row: { id: 'a-user' }, values: {} })
		})
		// Attach the rejection handler before settling the deferred request.
		const settled = completion.then(
			() => 'success',
			() => 'error',
		)
		await waitFor(() => {
			expect(firstFetcher).toHaveBeenCalledTimes(1)
		})
		rerender({ source: second })
		await act(async () => {
			if (outcome === 'success') firstRequest.resolve('saved')
			else firstRequest.reject(new Error('network'))
			expect(await settled).toBe(outcome === 'error' ? 'error' : 'success')
		})
		expect(secondFetcher).not.toHaveBeenCalled()
		expect(firstFetcher).toHaveBeenCalledTimes(outcome === 'retry' ? 2 : 1)
		expect(events).toEqual([outcome === 'error' ? 'error-a' : 'success-a'])
		if (outcome === 'error') expect(invalidate).not.toHaveBeenCalled()
		else expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users', 'a', 'list'] })
		expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['users', 'b', 'list'] })
		unmount()
		client.clear()
	},
)
