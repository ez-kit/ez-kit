import { createDataGrid, DataGridOptionsProvider, useGridOptions, useDataGridState } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents as shadcnComponents, cellTypes as shadcnCells } from '@ez-kit/data-grid-shadcn'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { version } from 'react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

type User = { id: string; name: string }
const sourceFactory = createGridSourceFactory({
	list: { prepareArgs: (params) => params, getRows: (rows: User[]) => rows },
})
const kits = {
	shadcn: withQuery(
		createDataGrid({ components: shadcnComponents, cellTypes: shadcnCells, features: allDataGridFeatures }),
	),
}

for (const name of ['shadcn', 'heroui'] as const) {
	// HeroUI declares React >=19; shadcn and the connector also support React 18.
	it.skipIf(name === 'heroui' && version.startsWith('18.'))(
		`${name}: inline and explicit table paths retain children and share one cache binding`,
		async () => {
			const hero = name === 'heroui' ? await import('@ez-kit/data-grid-heroui') : undefined
			const kit = hero
				? withQuery(
						createDataGrid({
							components: hero.allComponents,
							cellTypes: hero.cellTypes,
							features: allDataGridFeatures,
						}),
					)
				: kits.shadcn
			const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
			const fetcher = vi.fn(() => Promise.resolve([{ id: '1', name: 'Ada' }]))
			const source = sourceFactory({ key: [name, 'users'], getAll: fetcher })
			const columns = kit.createColumns<User>([{ accessorKey: 'name', cell: { type: 'text' } }])
			const retained = <kit.DataGrid.Table />
			const ui = render(
				<QueryClientProvider client={client}>
					<kit.DataGrid
						dataSource={source}
						columns={columns}
					>
						{retained}
					</kit.DataGrid>
				</QueryClientProvider>,
			)
			await screen.findByText('Ada')
			// Resolve the actual key from the single active list (page defaults belong to the grid).
			const query = client
				.getQueryCache()
				.getAll()
				.find((query) => query.getObserversCount() > 0 && query.queryKey[1] === 'users')
			if (!query) throw new Error('Missing active list')
			act(() => {
				client.setQueryData(query.queryKey, [{ id: '1', name: 'Grace' }])
			})
			await screen.findByText('Grace')
			expect(fetcher).toHaveBeenCalledTimes(1)
			ui.unmount()
			function Explicit() {
				const table = kit.useDataGrid({ dataSource: source, columns })
				return <kit.DataGrid table={table}>{retained}</kit.DataGrid>
			}
			const explicit = render(
				<QueryClientProvider client={client}>
					<Explicit />
				</QueryClientProvider>,
			)
			await screen.findByText('Grace')
			expect(fetcher).toHaveBeenCalledTimes(1)
			expect(query.getObserversCount()).toBe(1)
			explicit.unmount()
			client.clear()
		},
	)
	it.skipIf(name === 'heroui' && version.startsWith('18.'))(
		`${name}: selection bar calls deleteMany once with original entities`,
		async () => {
			const hero = name === 'heroui' ? await import('@ez-kit/data-grid-heroui') : undefined
			const kit = hero
				? withQuery(
						createDataGrid({
							components: hero.allComponents,
							cellTypes: hero.cellTypes,
							features: allDataGridFeatures,
						}),
					)
				: kits.shadcn
			const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
			const rows = [
				{ id: 'api-1', name: 'Ada' },
				{ id: 'api-2', name: 'Grace' },
			]
			const single = vi.fn((_id: string) => Promise.resolve())
			const many = vi.fn((_rows: User[]) => Promise.resolve())
			const source = sourceFactory({
				key: [name, 'bulk-users'],
				getAll: () => Promise.resolve(rows),
				delete: { fetcher: single, prepareArgs: ({ row }) => row.id },
				deleteMany: { fetcher: many, prepareArgs: ({ rows }) => rows },
			})
			const ui = render(
				<QueryClientProvider client={client}>
					<kit.DataGrid
						dataSource={source}
						columns={[{ accessorKey: 'name' }]}
						getRowId={(row) => `table-${row.id}`}
						selection
						deleting={{ bulk: true }}
						initialState={{ rowSelection: { 'table-api-1': true, 'table-api-2': true } }}
					>
						<kit.DataGrid.Table />
						<kit.DataGrid.ActionBar />
					</kit.DataGrid>
				</QueryClientProvider>,
			)
			await screen.findByText('Ada')
			fireEvent.click(within(screen.getByRole('toolbar')).getByRole('button', { name: /delete/i }))
			await waitFor(() => {
				expect(many).toHaveBeenCalledTimes(1)
			})
			expect(many.mock.calls[0]?.[0]).toEqual(rows)
			expect(single).not.toHaveBeenCalled()
			await waitFor(() => {
				expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0)
			})
			ui.unmount()
			client.clear()
		},
	)
}

it('applies provider defaults before connection and leaves disabled UI features disabled', async () => {
	const kit = kits.shadcn
	const client = new QueryClient()
	const source = sourceFactory({ key: ['defaults'], getAll: () => Promise.resolve([{ id: '1', name: 'Ada' }]) })
	const columns = kit.createColumns<User>([{ accessorKey: 'name' }])
	function Probe() {
		const grid = useGridOptions()
		return <span data-testid='defaults'>{String(grid.globalFiltering !== undefined)}</span>
	}
	const view = render(
		<QueryClientProvider client={client}>
			<DataGridOptionsProvider defaults={{ globalFiltering: true, pagination: { pageSize: 7 } }}>
				<kit.DataGrid
					dataSource={source}
					columns={columns}
					sorting={false}
				>
					<Probe />
				</kit.DataGrid>
			</DataGridOptionsProvider>
		</QueryClientProvider>,
	)
	await waitFor(() => expect(screen.getByTestId('defaults')).toHaveTextContent('true'))
	const query = client
		.getQueryCache()
		.getAll()
		.find((q) => q.queryKey[0] === 'defaults')
	expect(query?.queryKey).toMatchObject(['defaults', 'list', { pagination: { pageSize: 7 } }])
	view.unmount()
	client.clear()
})

it('publishes fetching and errors to retained children without discarding existing rows', async () => {
	const kit = kits.shadcn
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	let rejectRefresh!: (error: Error) => void
	const fetcher = vi.fn<() => Promise<User[]>>()
	fetcher.mockResolvedValueOnce([{ id: '1', name: 'Ada' }])
	fetcher.mockImplementationOnce(
		() =>
			new Promise((_resolve, reject) => {
				rejectRefresh = reject
			}),
	)
	const source = sourceFactory({ key: ['background'], getAll: fetcher })
	function Status() {
		const fetching = useDataGridState((state) => state.loading.isFetching)
		const failed = useDataGridState((state) => state.loading.isError)
		return (
			<span data-testid='status'>
				{String(fetching)}:{String(failed)}
			</span>
		)
	}
	const retained = (
		<>
			<Status />
			<kit.DataGrid.Table />
		</>
	)
	const ui = render(
		<QueryClientProvider client={client}>
			<kit.DataGrid
				dataSource={source}
				columns={[{ accessorKey: 'name' }]}
			>
				{retained}
			</kit.DataGrid>
		</QueryClientProvider>,
	)
	await screen.findByText('Ada')
	let refresh!: Promise<void>
	act(() => {
		refresh = client.invalidateQueries({ queryKey: ['background'] })
	})
	await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('true:false'))
	expect(screen.getByText('Ada')).toBeInTheDocument()
	await act(async () => {
		rejectRefresh(new Error('offline'))
		await refresh
	})
	await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('false:true'))
	expect(screen.getByText('Ada')).toBeInTheDocument()
	ui.unmount()
	client.clear()
})

it('keeps the built-in global search debounce', async () => {
	const kit = kits.shadcn
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const fetcher = vi.fn(() => Promise.resolve([{ id: '1', name: 'Ada' }]))
	const source = sourceFactory({ key: ['debounce'], getAll: fetcher })
	const ui = render(
		<QueryClientProvider client={client}>
			<kit.DataGrid
				dataSource={source}
				columns={[{ accessorKey: 'name' }]}
				globalFiltering={{ debounce: 50 }}
			>
				<kit.DataGrid.GlobalFilterInput />
				<kit.DataGrid.Table />
			</kit.DataGrid>
		</QueryClientProvider>,
	)
	await screen.findByText('Ada')
	const input = screen.getByRole('searchbox')
	fireEvent.change(input, { target: { value: 'G' } })
	fireEvent.change(input, { target: { value: 'Gr' } })
	fireEvent.change(input, { target: { value: 'Grace' } })
	expect(fetcher).toHaveBeenCalledTimes(1)
	await waitFor(() => {
		expect(fetcher).toHaveBeenCalledTimes(2)
	})
	const query = client
		.getQueryCache()
		.getAll()
		.find((q) => q.queryKey[0] === 'debounce' && q.getObserversCount() > 0)
	expect(query?.queryKey).toMatchObject(['debounce', 'list', { globalFilter: 'Grace' }])
	ui.unmount()
	client.clear()
})
