import { createColumns } from '@ez-kit/data-grid-core'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { startTransition, Suspense, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { DataTable, GridFeatures } from './types'

type User = { id: number; name: string; email: string }

const USERS: User[] = [{ id: 1, name: 'Alice', email: 'alice@example.com' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name' }, { accessorKey: 'email' }])

/**
 * Every feature's `onChange` has to survive the trip through `useDataGrid`.
 *
 * The React layer rebuilds each feature's config before handing it to `createTable`, splitting
 * off the fields core has no use for. Two of those splits were **allowlists** — they picked the
 * core fields by name — so `visibility.onChange` and `expanding.onChange` were dropped on the
 * floor: typed, documented, re-exported on the `React*` config, and never called. Nothing
 * failed; the callback simply never ran.
 *
 * Every split is a strip now (take the config, remove the React-only keys, pass the rest), and
 * this file is the guard: a feature added to the config with an `onChange` gets a case here, and
 * a future split that goes back to picking by name fails immediately instead of silently.
 */
describe('every feature onChange survives useDataGrid', () => {
	it('keeps committed callbacks while a transition suspends and publishes them after commit', async () => {
		const first = vi.fn()
		const second = vi.fn()
		const suspended = vi.fn()
		let loaded = false
		let release = (): void => {}
		const pending = new Promise<void>((resolve) => {
			release = () => {
				loaded = true
				resolve()
			}
		})

		function Grid({ next }: { next: boolean }) {
			const table = useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				sorting: { onChange: next ? second : first },
			})
			if (next && !loaded) {
				suspended()
				// Suspense consumes the pending resource promise rather than an Error.
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw pending
			}
			return (
				<button
					onClick={() => {
						table.setSorting((prev) => [{ id: 'name', desc: !prev[0]?.desc }])
					}}
				>
					{next ? 'Sort B' : 'Sort A'}
				</button>
			)
		}

		function Host() {
			const [next, setNext] = useState(false)
			return (
				<>
					<button
						onClick={() => {
							startTransition(() => {
								setNext(true)
							})
						}}
					>
						Change callback
					</button>
					<Suspense fallback='Loading'>
						<Grid next={next} />
					</Suspense>
				</>
			)
		}

		render(<Host />)
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Change callback' }))
			await Promise.resolve()
		})
		expect(suspended).toHaveBeenCalled()
		expect(screen.queryByText('Loading')).toBeNull()
		fireEvent.click(screen.getByRole('button', { name: 'Sort A' }))
		expect(first).toHaveBeenCalledTimes(1)
		expect(second).not.toHaveBeenCalled()

		await act(async () => {
			release()
			await pending
		})
		fireEvent.click(screen.getByRole('button', { name: 'Sort B' }))
		expect(first).toHaveBeenCalledTimes(1)
		expect(second).toHaveBeenCalledTimes(1)
	})

	it('enforces the current column rules after columns change', () => {
		const { result, rerender } = renderHook(
			({ forced }: { forced: boolean }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: [{ accessorKey: 'name', pinning: forced ? 'start' : false }, { accessorKey: 'email' }],
					pinning: { column: true },
				}),
			{ initialProps: { forced: false } },
		)
		rerender({ forced: true })
		act(() => {
			result.current.setColumnPinning({ start: [], end: [] })
		})
		expect(result.current.store.state.columnPinning.start).toEqual(['name'])
		rerender({ forced: false })
		act(() => {
			result.current.setColumnPinning({ start: [], end: [] })
		})
		expect(result.current.store.state.columnPinning.start).toEqual([])
	})

	it('uses the latest callback and restores the default writer when the callback is removed', () => {
		const first = vi.fn()
		const second = vi.fn()
		const initialProps: { onChange?: (next: { id: string; desc: boolean }[]) => void } = { onChange: first }
		const { result, rerender } = renderHook(
			({ onChange }: { onChange?: (next: { id: string; desc: boolean }[]) => void }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					sorting: onChange === undefined ? true : { onChange },
				}),
			{ initialProps },
		)
		rerender({ onChange: second })
		act(() => {
			result.current.setSorting([{ id: 'name', desc: false }])
		})
		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledTimes(1)
		rerender({})
		act(() => {
			result.current.setSorting([{ id: 'name', desc: true }])
		})
		expect(second).toHaveBeenCalledTimes(1)
		expect(result.current.store.state.sorting).toEqual([{ id: 'name', desc: true }])
		rerender({ onChange: first })
		act(() => {
			result.current.setSorting([])
		})
		expect(first).toHaveBeenCalledWith([])
	})

	function grid(config: Partial<Parameters<typeof useDataGrid<GridFeatures, User>>[0]>): DataTable<GridFeatures, User> {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, ...config }),
		)
		return result.current
	}

	it('visibility.onChange fires when a column is hidden', () => {
		const onChange = vi.fn()
		const table = grid({ visibility: { onChange } })
		act(() => {
			table.setColumnVisibility({ email: false })
		})
		expect(onChange).toHaveBeenCalledWith({ email: false })
	})

	it('reports the feature as on for both forms, so a layout gates its trigger the same way', () => {
		// `visibility` used to resolve to `{ toolbar }`, whose object form defaulted the other way
		// — so adding an `onChange` to a working `visibility: true` silently removed the only
		// control the feature has. It is one derived boolean now: the feature is on, and where its
		// trigger goes is the layout's to say.
		expect(grid({ visibility: { onChange: vi.fn() } }).grid.visibility).toBe(true)
		expect(grid({ visibility: true }).grid.visibility).toBe(true)
	})

	it('ordering.column.onChange fires when a column moves', () => {
		const onChange = vi.fn()
		const table = grid({ ordering: { column: { onChange } } })
		act(() => {
			table.setColumnOrder(['email', 'name'])
		})
		expect(onChange).toHaveBeenCalledWith(['email', 'name'])
	})

	it('expanding.onChange fires when a row is expanded', () => {
		const onChange = vi.fn()
		const table = grid({ expanding: { onChange } })
		act(() => {
			table.setExpanded({ '0': true })
		})
		expect(onChange).toHaveBeenCalledWith({ '0': true })
	})

	it('sorting.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ sorting: { onChange } })
		act(() => {
			table.setSorting([{ id: 'name', desc: false }])
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('filtering.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ filtering: { onChange } })
		act(() => {
			table.setColumnFilters([{ id: 'name', value: 'al' }])
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('globalFiltering.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ globalFiltering: { onChange } })
		act(() => {
			table.setGlobalFilter('al')
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('selection.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ selection: { onChange } })
		act(() => {
			table.setRowSelection({ '0': true })
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('pagination.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ pagination: { onChange } })
		act(() => {
			table.setPageSize(5)
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('resizing.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ resizing: { onChange } })
		act(() => {
			table.setColumnSizing({ name: 300 })
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('pinning.column.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ pinning: { column: { onChange } } })
		act(() => {
			table.setColumnPinning({ start: ['name'], end: [] })
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('pinning.row.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ pinning: { row: { onChange } } })
		act(() => {
			table.setRowPinning({ top: ['0'], bottom: [] })
		})
		expect(onChange).toHaveBeenCalled()
	})
})
