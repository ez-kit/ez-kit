import { createDataGrid, useDataGridState } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { allComponents, cellTypes } from '@ez-kit/data-grid-shadcn'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { version } from 'react'
import { expect, it, vi } from 'vitest'

import { createGridSourceFactory, withQuery } from './index'

type User = { id: string; name: string }
const factory = createGridSourceFactory({ list: { prepareArgs: (params) => params, getRows: (rows: User[]) => rows } })
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
function Status() {
	const loading = useDataGridState((state) => state.loading)
	return (
		<output data-testid='request-status'>
			{String(loading.isFetching)}:{String(loading.isError)}
		</output>
	)
}
for (const name of ['shadcn', 'heroui'] as const) {
	for (const mode of ['editing', 'creating'] as const) {
		for (const dismissal of ['close', 'success'] as const) {
			it.skipIf(name === 'heroui' && version.startsWith('18.'))(
				`${name} ${mode}: pending ${dismissal} preserves the mutation lifetime`,
				async () => {
					const hero = name === 'heroui' ? await import('@ez-kit/data-grid-heroui') : undefined
					const kit = withQuery(
						createDataGrid({
							components: hero?.allComponents ?? allComponents,
							cellTypes: hero?.cellTypes ?? cellTypes,
							features: allDataGridFeatures,
						}),
					)
					const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
					const validation = deferred<null>()
					const validate = vi.fn(() => validation.promise)
					const request = deferred<undefined>()
					const refresh = deferred<User[]>()
					const saved = vi.fn((_values: Record<string, unknown>) => request.promise)
					const onSuccess = vi.fn()
					const getAll = vi
						.fn<() => Promise<User[]>>()
						.mockResolvedValueOnce([{ id: '1', name: 'Ada' }])
						.mockImplementation(() => refresh.promise)
					const operation = {
						fetcher: saved,
						prepareArgs: ({ values }: { values: Record<string, unknown> }) => values,
						options: { onSuccess },
					}
					const source = factory({ key: [name, mode, dismissal], getAll, update: operation, create: operation })
					function App() {
						const table = kit.useDataGrid({
							dataSource: source,
							columns: [{ accessorKey: 'name', header: 'Name', cell: { type: 'text' } }],
							getRowId: (row) => row.id,
							editing: { mode: 'modal', validate },
							creating: { mode: 'modal', validate },
						})
						return (
							<>
								<button
									onClick={() => {
										if (mode === 'editing') table.editing.start('1')
										else table.creating.start()
									}}
								>
									Open form
								</button>
								<kit.DataGrid table={table}>
									<Status />
									<kit.DataGrid.Table />
								</kit.DataGrid>
							</>
						)
					}
					const view = render(
						<QueryClientProvider client={client}>
							<App />
						</QueryClientProvider>,
					)
					await screen.findByText('Ada')
					fireEvent.click(screen.getByRole('button', { name: 'Open form' }))
					const dialog = await screen.findByRole('dialog')
					const save = within(dialog).getByRole('button', { name: 'Save' })
					fireEvent.click(save)
					await waitFor(() => {
						expect(validate).toHaveBeenCalledTimes(1)
					})
					expect(save).toBeDisabled()
					expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
					fireEvent.click(save)
					expect(saved).not.toHaveBeenCalled()
					await act(async () => {
						validation.resolve(null)
						await validation.promise
					})

					await waitFor(() => {
						expect(saved).toHaveBeenCalledTimes(1)
					})
					expect(save).toBeDisabled()
					expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
					fireEvent.click(save)
					expect(saved).toHaveBeenCalledTimes(1)
					if (dismissal === 'close') {
						const close = within(dialog).getByRole('button', { name: /close/i })
						expect(close).not.toBeDisabled()
						fireEvent.click(close)
						await waitFor(() => {
							expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
						})
						expect(onSuccess).not.toHaveBeenCalled()
					}
					await act(async () => {
						request.resolve(undefined)
						await request.promise
					})
					await waitFor(() => {
						expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
						expect(getAll).toHaveBeenCalledTimes(2)
					})
					expect(onSuccess).toHaveBeenCalledTimes(1)
					await waitFor(() => {
						expect(screen.getByTestId('request-status')).toHaveTextContent('true:false')
					})
					expect(screen.getByText('Ada')).toBeInTheDocument()
					act(() => {
						refresh.reject(new Error('Refresh unavailable'))
					})
					await waitFor(() => {
						expect(screen.getByTestId('request-status')).toHaveTextContent('false:true')
					})
					expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
					expect(screen.getByText('Ada')).toBeInTheDocument()
					view.unmount()
					client.clear()
				},
			)
		}
	}
}
