import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { startTransition, Suspense, useEffect, useState } from 'react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

import type { PropsWithChildren } from 'react'

type User = { id: string; name: string }
const connected = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
const make = createGridSourceFactory({ list: { prepareArgs: () => undefined, getRows: (rows: User[]) => rows } })
function harness() {
	const client = new QueryClient()
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	return { client, wrapper }
}

it('saves the visible row with the last committed source while another render suspends', async () => {
	const { client, wrapper: Wrapper } = harness()
	const update = vi.fn((_args: { name: string | undefined; value: string | undefined }) => Promise.resolve())
	const source = (tenant: string) =>
		make({
			key: ['committed', tenant],
			getAll: () => Promise.resolve([{ id: '1', name: tenant }]),
			update: { prepareArgs: ({ row, values }) => ({ name: row?.name, value: values.name }), fetcher: update },
		})
	const A = source('A')
	const B = source('B')
	const suspend = new Promise<never>(() => undefined)
	let switchTenant!: (tenant: string) => void
	const capture = vi.fn()
	const attempted = vi.fn()
	function Host() {
		const [tenant, setTenant] = useState('A')
		const table = connected.useDataGrid({ dataSource: tenant === 'A' ? A : B, columns: [], editing: tenant === 'A' })
		useEffect(() => {
			switchTenant = setTenant
			capture(table)
		}, [table])
		if (tenant === 'B') {
			attempted()
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense consumes the pending promise
			throw suspend
		}
		return <span>Visible A</span>
	}
	const h = render(
		<Wrapper>
			<Suspense fallback={null}>
				<Host />
			</Suspense>
		</Wrapper>,
	)
	const table = capture.mock.calls[0]?.[0] as ReturnType<typeof connected.useDataGrid<User>>
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('A')
	})
	act(() => {
		table.editing.start('1')
		startTransition(() => {
			switchTenant('B')
		})
	})
	await waitFor(() => {
		expect(attempted).toHaveBeenCalled()
	})
	expect(screen.getByText('Visible A')).toBeTruthy()
	await act(async () => {
		await expect(table.editing.commit({ values: { name: 'A draft' } })).resolves.toEqual({ ok: true })
		switchTenant('A')
	})
	expect(update.mock.calls[0]?.[0]).toEqual({ name: 'A', value: 'A draft' })
	h.unmount()
	client.clear()
})

it('rejects selection-based deletion until the new scope acknowledges the controlled reset', async () => {
	const { client, wrapper } = harness()
	const remove = vi.fn((_args: { tenant: string; ids: string[] }) => Promise.resolve())
	const source = (tenant: string) =>
		make({
			key: ['controlled-selection', tenant],
			getAll: () => Promise.resolve([{ id: '1', name: tenant }]),
			delete: { prepareArgs: ({ rowId }) => rowId, fetcher: (_id: string) => Promise.resolve() },
			deleteMany: { prepareArgs: ({ rowIds }) => ({ tenant, ids: rowIds }), fetcher: remove },
		})
	const A = source('A')
	const B = source('B')
	const onChange = vi.fn()
	const h = renderHook(
		({ tenant, selected }) =>
			connected.useDataGrid({
				dataSource: tenant === 'A' ? A : B,
				scopeKey: [tenant],
				columns: [],
				state: { rowSelection: selected ? { '1': true } : {} },
				selection: { onChange },
				deleting: { bulk: true },
			}),
		{ wrapper, initialProps: { tenant: 'A', selected: true } },
	)
	const table = h.result.current
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('A')
	})
	h.rerender({ tenant: 'B', selected: true })
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('B')
	})
	expect(onChange).toHaveBeenCalled()
	act(() => {
		table.deleting.bulk.request()
	})
	expect(remove).not.toHaveBeenCalled()
	h.rerender({ tenant: 'B', selected: false })
	h.rerender({ tenant: 'B', selected: true })
	act(() => {
		table.deleting.bulk.request()
	})
	await waitFor(() => {
		expect(remove.mock.calls.map(([input]) => input)).toEqual([{ tenant: 'B', ids: ['1'] }])
	})
	h.unmount()
	client.clear()
})
