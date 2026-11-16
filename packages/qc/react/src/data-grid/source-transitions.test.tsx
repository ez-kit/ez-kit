import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { it, expect, vi } from 'vitest'

import { withQuery, createGridSourceFactory } from './index'

import type { ReactNode } from 'react'

type Row = { id: string; name: string }
const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
const factory = createGridSourceFactory({ list: { prepareArgs: () => undefined, getRows: (rows: Row[]) => rows } })
it.each(['changed', 'same', 'cancelled'] as const)('handles async validation with %s ownership', async (scenario) => {
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
		fetchB = vi.fn((_args: { owner: string; rowName: string | undefined; values: Partial<Row> }) => Promise.resolve())
	const make = (owner: string, fetcher: typeof fetchA) =>
		factory({
			key: ['audit-validation', owner],
			getAll: () => Promise.resolve([{ id: '1', name: owner }]),
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
			}),
		{ wrapper, initialProps: { source: A } },
	)
	await waitFor(() => {
		expect(h.result.current.getRowModel().rows[0]?.original.name).toBe('A')
	})
	act(() => {
		h.result.current.editing.start('1')
	})
	let completion!: ReturnType<typeof h.result.current.editing.commit>
	act(() => {
		completion = h.result.current.editing.commit({ values: { name: 'old-edit' } })
	})
	await waitFor(() => {
		expect(validate).toHaveBeenCalledTimes(1)
	})
	if (cancelled)
		act(() => {
			h.result.current.editing.cancel()
		})
	h.rerender({ source: B })
	await waitFor(() => {
		expect(h.result.current.getRowModel().rows[0]?.original.name).toBe(scenario === 'same' ? 'A' : 'B')
	})
	await act(async () => {
		const outcome =
			scenario !== 'changed'
				? completion
				: expect(completion).rejects.toThrow('Grid update source changed before dispatch')
		release()
		await outcome
	})
	const callsA = fetchA.mock.calls,
		callsB = fetchB.mock.calls
	h.unmount()
	client.clear()

	expect(callsB).toHaveLength(scenario === 'same' ? 1 : 0)
	expect(callsA).toHaveLength(0)
})
