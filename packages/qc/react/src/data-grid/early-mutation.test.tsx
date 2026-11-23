import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents } from '@ez-kit/data-grid-shadcn'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { renderHook, render, waitFor } from '@testing-library/react'
import { useLayoutEffect, useEffect, useRef } from 'react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory } from './testing/factory.fixture'
import { fixtureSource } from './testing/grid-source.fixture'

import { withQuery } from './index'

import type { PropsWithChildren } from 'react'

it.each([false, true])('create from a consumer layout effect (cancel before dispatch=%s)', async (cancel) => {
	const connected = withQuery(createDataGrid({ components: allComponents, features: allDataGridFeatures }))
	const client = new QueryClient()
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const fetcher = vi.fn((_values: Partial<{ id: string }>) => Promise.resolve())
	const source = createGridSourceFactory({
		list: { prepareArgs: () => undefined, getRows: (rows: { id: string }[]) => rows },
	})({
		key: ['early-layout'],
		getAll: () => Promise.resolve([] as { id: string }[]),
		create: { prepareArgs: ({ values }) => values, fetcher },
	})
	const outcomes: unknown[] = []
	const h = renderHook(
		() => {
			const table = connected.useDataGrid({
				dataSource: fixtureSource(source),
				columns: [{ accessorKey: 'id' }],
				creating: true,
			})
			useLayoutEffect(() => {
				table.creating.start()
				void table.creating.commit({ values: { id: 'new' } }).then(
					(x) => outcomes.push(x),
					(e: unknown) => outcomes.push(e),
				)
				if (cancel) table.creating.cancel()
			}, [table])
			return table
		},
		{ wrapper },
	)
	await waitFor(() => {
		expect(outcomes).toHaveLength(1)
	})
	expect(outcomes[0]).toEqual(cancel ? { ok: false, reason: 'cancelled' } : { ok: true })
	expect(fetcher).toHaveBeenCalledTimes(cancel ? 0 : 1)
	h.unmount()
	client.clear()
})

it('native mutation from initial layout effect works', async () => {
	const client = new QueryClient()
	const fetcher = vi.fn(() => Promise.resolve())
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const h = renderHook(
		() => {
			const mutation = useMutation({ mutationFn: fetcher })
			const { mutate } = mutation
			useLayoutEffect(() => {
				mutate()
			}, [mutate])
			return mutation
		},
		{ wrapper },
	)
	await waitFor(() => {
		expect(h.result.current.isSuccess).toBe(true)
	})
	expect(fetcher).toHaveBeenCalledTimes(1)
	h.unmount()
	client.clear()
})
it('child passive effect before bridge publication', async () => {
	const connected = withQuery(createDataGrid({ components: allComponents, features: allDataGridFeatures }))
	const client = new QueryClient()
	const fetcher = vi.fn((_values: Partial<{ id: string }>) => Promise.resolve())
	const outcomes: unknown[] = []
	const source = createGridSourceFactory({
		list: { prepareArgs: () => undefined, getRows: (rows: { id: string }[]) => rows },
	})({
		key: ['early-child'],
		getAll: () => Promise.resolve([] as { id: string }[]),
		create: { prepareArgs: ({ values }) => values, fetcher },
	})
	function Child({ save }: { save: () => Promise<unknown> }) {
		const started = useRef(false)
		useEffect(() => {
			if (started.current) return
			started.current = true
			void save().then(
				(x) => outcomes.push(x),
				(e: unknown) => outcomes.push(e),
			)
		}, [save])
		return null
	}
	function Parent() {
		const table = connected.useDataGrid({
			dataSource: fixtureSource(source),
			columns: [{ accessorKey: 'id' }],
			creating: true,
		})
		return (
			<Child
				save={() => {
					table.creating.start()
					return table.creating.commit({ values: { id: 'new' } })
				}}
			/>
		)
	}
	const h = render(
		<QueryClientProvider client={client}>
			<Parent />
		</QueryClientProvider>,
	)
	await waitFor(() => {
		expect(outcomes).toHaveLength(1)
	})
	expect(outcomes[0]).toEqual({ ok: true })
	expect(fetcher).toHaveBeenCalledTimes(1)
	h.unmount()
	client.clear()
})

it.each(['single', 'bulk'] as const)('skips %s deletion cancelled before observer publication', async (mode) => {
	const connected = withQuery(createDataGrid({ components: allComponents, features: allDataGridFeatures }))
	const client = new QueryClient()
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const fetcher = vi.fn((_ids: string[]) => Promise.resolve())
	const rows = [{ id: '1' }]
	const source = createGridSourceFactory({
		list: { prepareArgs: () => undefined, getRows: (values: typeof rows) => values },
	})({
		key: ['early-delete'],
		getAll: { fetcher: () => Promise.resolve(rows), options: { initialData: rows } },
		delete: { prepareArgs: ({ rowId }) => [rowId], fetcher },
		deleteMany: { prepareArgs: ({ rowIds }) => rowIds, fetcher },
	})
	const settled = vi.fn()
	const h = renderHook(
		({ run }) => {
			const table = connected.useDataGrid({
				dataSource: fixtureSource(source),
				columns: [{ accessorKey: 'id' }],
				deleting: { bulk: true },
				getRowId: (row) => row.id,
			})
			useLayoutEffect(() => {
				if (!run) return
				if (mode === 'single') {
					void table.deleting.delete('1').then(settled)
					table.deleting.cancel()
				} else {
					void table.deleting.bulk.delete(['1']).then(settled)
					table.deleting.bulk.cancel()
				}
			}, [run, table])
			return table
		},
		{ wrapper, initialProps: { run: false } },
	)
	await waitFor(() => {
		expect(h.result.current.getRowModel().rows).toHaveLength(1)
	})
	h.rerender({ run: true })
	await waitFor(() => {
		expect(settled).toHaveBeenCalledTimes(1)
	})
	expect(fetcher).not.toHaveBeenCalled()
	h.unmount()
	client.clear()
})
