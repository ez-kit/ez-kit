import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { startTransition, Suspense, useEffect, useState } from 'react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

import type { DataTable } from '@ez-kit/data-grid-react'
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
	const table = capture.mock.calls[0]?.[0] as DataTable<typeof allDataGridFeatures, User>
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

it('uses the visible columns and state callback when another source suspends', async () => {
	const { client, wrapper: Wrapper } = harness()
	const create = vi.fn((_args: { tenant: string; name: string | undefined }) => Promise.resolve())
	const source = (tenant: string) =>
		make({
			key: ['committed-columns', tenant],
			getAll: () => Promise.resolve([{ id: '1', name: tenant }]),
			create: { prepareArgs: ({ values }) => ({ tenant, name: values.name }), fetcher: create },
		})
	const A = source('A')
	const B = source('B')
	const onA = vi.fn()
	const onB = vi.fn()
	const attempted = vi.fn()
	const suspend = new Promise<never>(() => undefined)
	let switchTenant!: (tenant: string) => void
	let table!: DataTable<typeof allDataGridFeatures, User>
	function Host() {
		const [tenant, setTenant] = useState('A')
		const view = connected.useDataGrid({
			dataSource: tenant === 'A' ? A : B,
			columns: [{ id: 'name', accessorFn: (row) => `${tenant}:${row.name}`, creating: { defaultValue: tenant } }],
			editing: { onSave: () => Promise.resolve() },
			creating: true,
			onStateChange: tenant === 'A' ? onA : onB,
		})
		useEffect(() => {
			switchTenant = setTenant
			table = view
		}, [view])
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
	await waitFor(() => {
		expect(table.getRowModel().rows[0]?.original.name).toBe('A')
	})
	act(() => {
		startTransition(() => {
			switchTenant('B')
		})
	})
	await waitFor(() => {
		expect(attempted).toHaveBeenCalled()
	})
	expect(screen.getByText('Visible A')).toBeTruthy()
	act(() => {
		table.editing.startCell('1', 'name')
	})
	expect(table.editing.getState().values).toEqual({ name: 'A:A' })
	act(() => {
		table.editing.cancel()
	})
	onA.mockClear()
	onB.mockClear()
	act(() => {
		table.creating.start()
	})
	expect(table.creating.getState().values).toEqual({ name: 'A' })
	expect(onA.mock.calls[0]?.[0]).toMatchObject({ creating: { isOpen: true } })
	expect(onB).not.toHaveBeenCalled()
	await act(async () => {
		await expect(table.creating.commit()).resolves.toEqual({ ok: true })
	})
	expect(create.mock.calls[0]?.[0]).toEqual({ tenant: 'A', name: 'A' })
	h.unmount()
	client.clear()
})

it('deletes a child expanded without rerendering the connected hook', async () => {
	const { client, wrapper } = harness()
	type TreeRow = User & { children?: TreeRow[] }
	const rows: TreeRow[] = [{ id: 'parent', name: 'Parent', children: [{ id: 'child', name: 'Child' }] }]
	const remove = vi.fn((_id: string) => Promise.resolve())
	const source = createGridSourceFactory({
		list: { prepareArgs: () => undefined, getRows: (data: TreeRow[]) => data },
	})({
		key: ['committed-tree'],
		getAll: () => Promise.resolve(rows),
		delete: { prepareArgs: ({ rowId }) => rowId, fetcher: remove },
	})
	const rendered = vi.fn()
	const h = renderHook(
		() => {
			rendered()
			return connected.useDataGrid({
				dataSource: source,
				columns: [],
				deleting: true,
				expanding: { mode: 'tree', getSubRows: (row) => row.children },
			})
		},
		{ wrapper },
	)
	const table = h.result.current
	await waitFor(() => {
		expect(table.getRowModel().rows.map((row) => row.id)).toEqual(['parent'])
	})
	rendered.mockClear()
	act(() => {
		table.getRow('parent').toggleExpanded()
	})
	expect(table.getRowModel().rows.map((row) => row.id)).toEqual(['parent', 'child'])
	expect(rendered).not.toHaveBeenCalled()
	await act(async () => {
		await table.deleting.delete('child')
	})
	expect(remove.mock.calls[0]?.[0]).toBe('child')
	h.unmount()
	client.clear()
})
