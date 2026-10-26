import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from './data-grid/data-grid'
import { DEFAULT_LOADING } from './normalize-controlled-state'
import { TEST_FEATURES, renderWithComponents } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { LoadingState, TableState } from '@ez-kit/data-grid-core'
import type { ReactElement } from 'react'

type Row = { id: number; name: string }

const ROWS: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'id', header: 'ID' },
	{ accessorKey: 'name', header: 'Name' },
])

type HostProps = { loading?: Partial<LoadingState>; data?: Row[] }

function Host({ loading, data = ROWS }: HostProps): ReactElement {
	const table = useDataGrid({
		features: TEST_FEATURES,
		data,
		columns: COLUMNS,
		...(loading === undefined ? {} : { state: { loading } }),
	})
	return <DataGrid table={table} />
}

/** The controlled-state hook on its own, for the cases that read the store rather than the DOM. */
function useLoadingGrid(
	loading: Partial<LoadingState>,
	onStateChange?: (state: TableState<typeof TEST_FEATURES>) => void,
) {
	return useDataGrid({
		features: TEST_FEATURES,
		data: ROWS,
		columns: COLUMNS,
		state: { loading },
		...(onStateChange === undefined ? {} : { onStateChange }),
	})
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('state.loading — partial object', () => {
	it('renders the loading fallback from `isPending` alone', () => {
		renderWithComponents(
			<Host
				loading={{ isPending: true }}
				data={[]}
			/>,
		)

		expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
	})

	it('renders the refetch overlay over existing rows from `isFetching` alone', () => {
		renderWithComponents(<Host loading={{ isFetching: true }} />)

		expect(screen.getByTestId('refetch-overlay')).toBeInTheDocument()
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('stores the error fields and defaults the flags it was not given', () => {
		const boom = new Error('boom')

		const { result } = renderHook(() => useLoadingGrid({ isError: true, error: boom }))

		expect(result.current.store.state.loading).toEqual({
			isPending: false,
			isFetching: false,
			isError: true,
			error: boom,
		})
	})

	it.each([
		['an empty object', {}],
		['no loading at all', undefined],
	])('renders neither the fallback nor the overlay for %s', (_name, loading) => {
		renderWithComponents(<Host {...(loading === undefined ? {} : { loading })} />)

		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
	})

	it('holds the same slice for `{}` as for a grid that never controlled it', () => {
		const { result } = renderHook(() => useLoadingGrid({}))

		expect(result.current.store.state.loading).toEqual(DEFAULT_LOADING)
	})

	it('narrows a query-shaped result to the four fields', () => {
		const query = { isPending: false, isFetching: true, isError: false, error: null, data: ROWS, status: 'success' }

		const { result } = renderHook(() => useLoadingGrid(query))

		expect(result.current.store.state.loading).toEqual({
			isPending: false,
			isFetching: true,
			isError: false,
			error: null,
		})
	})
})

describe('state.loading — identity across renders', () => {
	it('keeps the slice and stays silent when a re-render passes an equal new object', () => {
		const onStateChange = vi.fn()
		const { result, rerender } = renderHook(
			({ tag }: { tag: number }) => useLoadingGrid({ isPending: tag >= 0 }, onStateChange),
			{ initialProps: { tag: 0 } },
		)
		const sliceBefore = result.current.store.state.loading
		onStateChange.mockClear()

		rerender({ tag: 1 })

		expect(result.current.store.state.loading).toBe(sliceBefore)
		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('publishes a changed field without reporting it back', () => {
		const onStateChange = vi.fn()
		const { result, rerender } = renderHook(
			({ isPending }: { isPending: boolean }) => useLoadingGrid({ isPending }, onStateChange),
			{ initialProps: { isPending: false } },
		)
		onStateChange.mockClear()

		rerender({ isPending: true })

		expect(result.current.store.state.loading.isPending).toBe(true)
		expect(onStateChange).not.toHaveBeenCalled()
	})
})

describe('state.loading — unrecognised object', () => {
	it('warns once, naming the foreign keys, for an SWR-shaped response', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const swr = { isLoading: true, isValidating: false, error: undefined, mutate: () => undefined }
		const { rerender } = renderHook(() => useLoadingGrid(swr))

		rerender()
		rerender()

		const loadingWarnings = warn.mock.calls.filter(([message]) => String(message).includes('state.loading'))
		expect(loadingWarnings).toHaveLength(1)
		expect(String(loadingWarnings[0]?.[0])).toMatch(/"isLoading", "isValidating", "mutate"/)
	})

	it('stays silent for a partial object', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		renderHook(() => useLoadingGrid({ isPending: true }))

		expect(warn.mock.calls.some(([message]) => String(message).includes('state.loading'))).toBe(false)
	})
})

describe('state.loading — defaults', () => {
	it('matches the slice core seeds for a grid without a seed', () => {
		const { result } = renderHook(() => useDataGrid({ features: TEST_FEATURES, data: ROWS, columns: COLUMNS }))

		expect(result.current.store.state.loading).toEqual(DEFAULT_LOADING)
	})
})
