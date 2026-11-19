import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { it, expect, vi } from 'vitest'

import { withQuery, createGridSourceFactory } from './index'

import type { ReactNode } from 'react'

type Row = { id: string; name: string }
const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
const factory = createGridSourceFactory({ list: { prepareArgs: () => undefined, getRows: (rows: Row[]) => rows } })
for (const mode of ['editing', 'creating'] as const) {
	it.each(['changed', 'same', 'cancelled'] as const)(
		`${mode}: handles async validation with %s ownership`,
		async (scenario) => {
			const cancelled = scenario === 'cancelled'
			const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
			const wrapper = ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			)
			let release!: () => void
			const validating = new Promise<null>((r) => {
				release = () => {
					r(null)
				}
			})
			const validate = vi.fn(() => validating)
			const fetchA = vi.fn((_args: { owner: string; rowName: string | undefined; values: Partial<Row> }) =>
					Promise.resolve(),
				),
				fetchB = vi.fn((_args: { owner: string; rowName: string | undefined; values: Partial<Row> }) =>
					Promise.resolve(),
				)
			const make = (owner: string, fetcher: typeof fetchA) =>
				factory({
					key: ['audit-validation', owner],
					getAll: () => Promise.resolve([{ id: '1', name: owner }]),
					create: { prepareArgs: ({ values }) => ({ owner, rowName: undefined, values }), fetcher },
					update: { prepareArgs: ({ values, row }) => ({ owner, rowName: row?.name, values }), fetcher },
				})
			const A = make('A', fetchA),
				B = make(scenario === 'same' ? 'A' : 'B', fetchB)
			const h = renderHook(
				({ source }) =>
					connected.useDataGrid({
						dataSource: source,
						columns: [{ accessorKey: 'name' }],
						getRowId: (row) => row.id,
						editing: { validate },
						creating: { validate },
					}),
				{ wrapper, initialProps: { source: A } },
			)
			await waitFor(() => {
				expect(h.result.current.getRowModel().rows[0]?.original.name).toBe('A')
			})
			act(() => {
				if (mode === 'editing') h.result.current.editing.start('1')
				else h.result.current.creating.start()
			})
			let completion!: ReturnType<typeof h.result.current.editing.commit>
			act(() => {
				completion = h.result.current[mode].commit({ values: { name: 'old-edit' } })
			})
			await waitFor(() => {
				expect(validate).toHaveBeenCalledTimes(1)
			})
			if (cancelled)
				act(() => {
					h.result.current[mode].cancel()
				})
			h.rerender({ source: B })
			await waitFor(() => {
				expect(h.result.current.getRowModel().rows[0]?.original.name).toBe(scenario === 'same' ? 'A' : 'B')
			})
			if (scenario === 'changed') {
				await expect(completion).resolves.toEqual({ ok: false, reason: 'cancelled' })
				expect(h.result.current[mode].getState()).toMatchObject({
					values: { name: 'old-edit' },
					commitStatus: 'idle',
					formError: null,
					errors: {},
				})
			}
			await act(async () => {
				const outcome = expect(completion).resolves.toEqual(
					scenario === 'same' ? { ok: true } : { ok: false, reason: 'cancelled' },
				)
				release()
				await outcome
			})
			const callsA = fetchA.mock.calls,
				callsB = fetchB.mock.calls
			h.unmount()
			client.clear()

			expect(callsB).toHaveLength(scenario === 'same' ? 1 : 0)
			expect(callsA).toHaveLength(0)
		},
	)
}

it('protects row actions and an idle draft across a source change, including placeholder rows', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { placeholderData: keepPreviousData } } })
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	let resolveB!: (rows: Row[]) => void
	const pendingB = new Promise<Row[]>((resolve) => {
		resolveB = resolve
	})
	const update = vi.fn((name: string | undefined) => Promise.resolve(name))
	const remove = vi.fn((id: string) => Promise.resolve(id))
	const make = (owner: string, getAll: () => Promise<Row[]>) =>
		factory({
			key: ['tenant', owner],
			getAll,
			update: { prepareArgs: ({ values }) => values.name, fetcher: update },
			delete: { prepareArgs: ({ row }) => row.id, fetcher: remove },
		})
	const A = make('A', () => Promise.resolve([{ id: '1', name: 'A' }]))
	const B = make('B', () => pendingB)
	const h = renderHook(
		({ source }) =>
			connected.useDataGrid({
				dataSource: source,
				columns: [{ accessorKey: 'name' }],
				getRowId: (row) => row.id,
				editing: true,
				deleting: { confirmation: true },
			}),
		{ wrapper, initialProps: { source: A } },
	)
	const table = h.result.current
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('A')
	})
	act(() => {
		table.editing.start('1')
		table.editing.setValue('name', 'A draft')
		table.deleting.request('1')
	})
	h.rerender({ source: B })
	expect(table.getRowModel().rows).toHaveLength(0)
	expect(table.deleting.getState().pendingRowId).toBeNull()
	await act(async () => {
		await table.deleting.delete('1')
		resolveB([{ id: '1', name: 'B' }])
	})
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('B')
	})
	await act(async () => {
		await table.deleting.confirm()
		await expect(table.editing.commit()).resolves.toMatchObject({ ok: false, reason: 'rejected' })
	})
	expect(remove).not.toHaveBeenCalled()
	expect(update).not.toHaveBeenCalled()
	expect(table.editing.getState().values.name).toBe('A draft')
	await act(async () => {
		table.editing.start('1')
		await expect(table.editing.commit()).resolves.toEqual({ ok: true })
	})
	expect(update.mock.calls[0]?.[0]).toBe('B')
	h.unmount()
	client.clear()
})

it('keeps the new selection when an already dispatched bulk delete finishes for the old source', async () => {
	const client = new QueryClient()
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	let resolve!: () => void
	const pending = new Promise<void>((done) => {
		resolve = done
	})
	const removeMany = vi.fn((_ids: string[]) => pending)
	const make = (owner: string) =>
		factory({
			key: ['bulk-scope', owner],
			getAll: () => Promise.resolve([{ id: '1', name: owner }]),
			delete: { prepareArgs: ({ rowId }) => rowId, fetcher: (_id: string) => Promise.resolve() },
			deleteMany: { prepareArgs: ({ rowIds }) => rowIds, fetcher: removeMany },
		})
	const A = make('A')
	const B = make('B')
	const h = renderHook(
		({ source }) =>
			connected.useDataGrid({
				dataSource: source,
				columns: [{ accessorKey: 'name' }],
				getRowId: (row) => row.id,
				selection: true,
				deleting: { bulk: true },
			}),
		{ wrapper, initialProps: { source: A } },
	)
	const table = h.result.current
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('A')
	})
	let completion!: Promise<void>
	act(() => {
		table.setRowSelection({ '1': true })
		completion = table.deleting.bulk.delete(['1'])
	})
	await waitFor(() => {
		expect(removeMany).toHaveBeenCalledTimes(1)
	})
	h.rerender({ source: B })
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('B')
	})
	expect(table.store.state.rowSelection).toEqual({})
	act(() => {
		table.setRowSelection({ '1': true })
	})
	await act(async () => {
		resolve()
		await completion
	})
	expect(table.store.state.rowSelection).toEqual({ '1': true })
	h.unmount()
	client.clear()
})
