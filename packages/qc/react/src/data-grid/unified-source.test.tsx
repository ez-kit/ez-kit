import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { useCollectionQuery } from '@ez-kit/query-react/collection'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, expectTypeOf, it, vi } from 'vitest'

import { createDataGridSource, withQuery } from './index'

import type { PropsWithChildren } from 'react'

it('connects a single source to both views and passes grid action inputs into collection mutations', async () => {
	type Row = { id: string; name: string }
	let rows: Row[] = [{ id: '1', name: 'Ada' }]
	const fetcher = vi.fn(({ search }: { search: string }) =>
		Promise.resolve(rows.filter((row) => row.name.includes(search))),
	)
	const remove = vi.fn((id: string) => {
		rows = rows.filter((row) => row.id !== id)
		return Promise.resolve()
	})
	const source = createDataGridSource({
		key: ['shared-grid'],
		read: {
			prepareArgs: (input) => ({ search: String(input.params.globalFilter ?? '') }),
			fetcher,
			getItems: (items) => items,
		},
		delete: {
			prepareArgs: ({ row }) => row.id,
			fetcher: remove,
		},
	})
	const grid = withQuery(createDataGrid({ components: {}, features: allDataGridFeatures }))
	const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	const hook = renderHook(
		() => ({
			table: grid.useDataGrid({
				dataSource: source,
				columns: [{ accessorKey: 'name' }],
				pagination: { pageSize: 20 },
				deleting: true,
			}),
			list: useCollectionQuery({
				source,
				params: { sorting: [], columnFilters: [], globalFilter: undefined },
				pagination: { mode: 'pages', pageIndex: 0, pageSize: 20 },
			}),
		}),
		{ wrapper },
	)
	const table = hook.result.current.table
	expectTypeOf(table.options.data[0]).toEqualTypeOf<Row | undefined>()
	await waitFor(() => {
		expect(table.options.data).toEqual(rows)
		expect(hook.result.current.list.items).toEqual(rows)
	})
	expect(fetcher).toHaveBeenCalledTimes(1)
	await act(async () => {
		await table.deleting.delete('1')
	})
	expect(remove).toHaveBeenCalledWith('1')
	await waitFor(() => {
		expect(table.options.data).toHaveLength(0)
		expect(hook.result.current.list.items).toHaveLength(0)
	})
	hook.unmount()
	client.clear()
})
