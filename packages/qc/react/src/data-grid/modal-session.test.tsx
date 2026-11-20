import { createDataGrid, ValidationError } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

import type { PropsWithChildren } from 'react'

const kit = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
type User = { id: string; name: string }
const makeSource = createGridSourceFactory({
	list: { prepareArgs: (params) => params, getRows: (rows: User[]) => rows },
})
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}

for (const mode of ['editing', 'creating'] as const) {
	for (const outcome of ['success', 'error'] as const) {
		for (const dispose of [false, true]) {
			it(`${mode}: old ${outcome} is isolated after ${dispose ? 'unmount' : 'opening a new session'}`, async () => {
				const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
				const invalidation = vi.spyOn(client, 'invalidateQueries')
				const pending = deferred<undefined>()
				const fetcher = vi.fn((_values: Record<string, unknown>) => pending.promise)
				const onSuccess = vi.fn()
				const onError = vi.fn()
				const operation = {
					fetcher,
					prepareArgs: ({ values }: { values: Record<string, unknown> }) => values,
					options: { onSuccess, onError },
					transformError: () => new ValidationError({ errors: { name: ['Already used'] } }),
				}
				const source = makeSource({
					key: [mode, outcome],
					getAll: () => Promise.resolve([{ id: '1', name: 'Ada' }]),
					update: operation,
					create: operation,
				})
				const wrapper = ({ children }: PropsWithChildren) => (
					<QueryClientProvider client={client}>{children}</QueryClientProvider>
				)
				const { result, unmount } = renderHook(
					() =>
						kit.useDataGrid({
							dataSource: source,
							columns: [{ accessorKey: 'name' }],
							getRowId: (row) => row.id,
							editing: { mode: 'modal' },
							creating: { mode: 'modal' },
						}),
					{ wrapper },
				)
				const table = result.current
				await waitFor(() => {
					expect(table.getRowModel().rows).toHaveLength(1)
				})
				const form = table[mode]
				act(() => {
					if (mode === 'editing') table.editing.start('1')
					else table.creating.start()
				})
				let completion!: ReturnType<typeof form.commit>
				act(() => {
					completion = form.commit({ values: { name: 'Old' } })
				})
				await waitFor(() => {
					expect(fetcher).toHaveBeenCalledTimes(1)
				})
				act(() => {
					form.cancel()
					if (mode === 'editing') table.editing.start('1')
					else table.creating.start()
					form.setValue('name', 'New session')
				})
				if (dispose) unmount()
				const current = form.getState()
				const original = new Error('server refused')
				await act(async () => {
					if (outcome === 'success') pending.resolve(undefined)
					else pending.reject(original)
					expect(await completion).toEqual({ ok: false, reason: 'cancelled' })
				})
				expect(invalidation).toHaveBeenCalledTimes(outcome === 'success' ? 2 : 0)
				expect(form.getState()).toEqual(current)
				expect(form.getState().errors).toEqual({})
				expect(onSuccess).toHaveBeenCalledTimes(outcome === 'success' ? 1 : 0)
				expect(onError).toHaveBeenCalledTimes(outcome === 'error' ? 1 : 0)
				if (outcome === 'error') expect(onError.mock.calls[0]?.[0]).toBe(original)
				unmount()
				client.clear()
			})
		}
	}
}

for (const mode of ['editing', 'creating'] as const) {
	it(`${mode}: inherited server validation maps into the active form only`, async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const original = Object.assign(new Error('API validation'), { fields: { name: ['Already used'] } })
		const onError = vi.fn()
		const transformError = vi.fn((error: unknown) =>
			error === original
				? new ValidationError({ errors: original.fields, formError: 'Please correct the fields' })
				: error,
		)
		const source = makeSource({
			key: [mode, 'validation'],
			getAll: () => Promise.resolve([{ id: '1', name: 'Ada' }]),
			transformError,
			create: {
				fetcher: (_values: Partial<User>) => Promise.reject(original),
				prepareArgs: ({ values }) => values,
				options: { onError },
			},
			update: {
				fetcher: (_values: Partial<User>) => Promise.reject(original),
				prepareArgs: ({ values }) => values,
				options: { onError },
			},
		})
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		)
		const { result, unmount } = renderHook(
			() =>
				kit.useDataGrid({
					dataSource: source,
					columns: [{ accessorKey: 'name' }],
					getRowId: (row) => row.id,
					editing: { mode: 'modal' },
					creating: { mode: 'modal' },
				}),
			{ wrapper },
		)
		const table = result.current
		await waitFor(() => {
			expect(table.getRowModel().rows).toHaveLength(1)
		})
		act(() => {
			if (mode === 'editing') table.editing.start('1')
			else table.creating.start()
		})
		await act(async () => {
			const outcome = await table[mode].commit({ values: { name: 'Duplicate' } })
			expect(outcome.ok).toBe(false)
		})
		expect(table[mode].getState().errors).toEqual(original.fields)
		expect(table[mode].getState().formError).toBe('Please correct the fields')
		expect(onError.mock.calls[0]?.[0]).toBe(original)
		expect(transformError).toHaveBeenCalledWith(original)
		unmount()
		client.clear()
	})
}
