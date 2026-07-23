import { defineColumns, UNKNOWN_PAGE_COUNT } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { renderWithComponents } from '../test-utils'
import { PaginationVariants } from '../types'
import { useDataGrid } from '../use-data-grid'

import { Pagination } from './pagination'
import { TableContext } from './table-context'

import type { PaginationProps } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const PAGE_SIZE = 10
const USERS: User[] = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `User ${String(i + 1)}` }))
const COLUMNS = defineColumns<User>([{ accessorKey: 'name' }])

/**
 * Render the real `Pagination` against a real grid instance and capture the props it hands to
 * the UI kit — or `null` when the footer short-circuits to `return null` (a known-empty grid).
 * This is the seam the kits consume, so it is where the "unknown total" normalization and the
 * known-empty gate both have to hold.
 */
function renderPagination(
	config: Omit<UseDataGridConfig<User>, 'data' | 'columns'>,
	data: User[] = USERS,
): { props: PaginationProps | null; table: DataTable<User> } {
	let captured: PaginationProps | null = null
	const Spy = (props: PaginationProps): ReactNode => {
		captured = props
		return null
	}

	const { result } = renderHook(() => useDataGrid<User>({ data, columns: COLUMNS, ...config }))
	const instance = result.current

	renderWithComponents(
		<TableContext value={instance}>
			<GridComponentsProvider components={{ pagination: { Pagination: Spy } }}>
				<Pagination />
			</GridComponentsProvider>
		</TableContext>,
	)

	return { props: captured, table: instance.table }
}

/**
 * {@link renderPagination} for the cases that require the footer to render — it fails loudly
 * rather than handing back a `null` the caller would have to narrow.
 */
function captureProps(
	config: Omit<UseDataGridConfig<User>, 'data' | 'columns'>,
	data: User[] = USERS,
): { props: PaginationProps; table: DataTable<User> } {
	const { props, table } = renderPagination(config, data)
	if (!props) throw new Error('Pagination did not render')
	return { props, table }
}

describe('Pagination — hides the footer on a known-empty grid', () => {
	const EMPTY: User[] = []

	it('renders nothing when a client-side grid has no rows', () => {
		// rowCount 0 / pageCount 0 — a trusted, meaningful zero: nothing to paginate.
		expect(renderPagination({ pagination: { pageSize: PAGE_SIZE } }, EMPTY).props).toBeNull()
	})

	it('renders nothing when a manual grid reports rowCount 0', () => {
		expect(renderPagination({ pagination: { manual: true, pageSize: PAGE_SIZE, rowCount: 0 } }, EMPTY).props).toBeNull()
	})

	it('renders nothing when a manual grid reports pageCount 0', () => {
		expect(
			renderPagination({ pagination: { manual: true, pageSize: PAGE_SIZE, pageCount: 0 } }, EMPTY).props,
		).toBeNull()
	})

	// The gate keys off `pageCount` alone, which is sound only because supplying `rowCount`
	// makes core derive `pageCount` from it — `useDataGrid` keeps the two mutually exclusive.
	// Pin that derivation: were it to change so a trusted `rowCount: 0` no longer implied
	// `pageCount: 0`, the gate would start showing a footer on an empty grid, and this fails
	// first, naming the reason.
	it('derives pageCount 0 from a trusted rowCount 0 — the value the gate keys off', () => {
		const { table } = renderPagination({ pagination: { manual: true, pageSize: PAGE_SIZE, rowCount: 0 } }, EMPTY)
		expect(table.getRowCount()).toBe(0)
		expect(table.options.pageCount).toBeUndefined()
		expect(table.getPageCount()).toBe(0)
	})

	// Regression guard: an *unknown* total is not an empty total. A manual grid given neither
	// count still knows which page it is on, so the footer stays and shows `Page N`.
	it('keeps the footer when the total is unknown', () => {
		const { props } = renderPagination({ pagination: { manual: true, pageSize: PAGE_SIZE } }, USERS.slice(0, PAGE_SIZE))
		expect(props).not.toBeNull()
		expect(props?.rowCount).toBeUndefined()
		expect(props?.pageCount).toBeUndefined()
	})
})

describe('Pagination — variant plumbing', () => {
	it('passes the configured variant through to the UI kit', () => {
		const { props } = captureProps({ pagination: { pageSize: PAGE_SIZE, variant: PaginationVariants.Compact } })
		expect(props.variant).toBe(PaginationVariants.Compact)
	})

	it('defaults to the numbered variant', () => {
		const { props } = captureProps({ pagination: true })
		expect(props.variant).toBe(PaginationVariants.Numbered)
	})

	it('passes the real pageSize, not one derived from rowCount ÷ pageCount', () => {
		// 11 rows @ pageSize 10 → 2 pages. The old derivation (ceil(11/2)) reported 6.
		const { props } = captureProps({ pagination: { pageSize: PAGE_SIZE } }, USERS.slice(0, 11))
		expect(props.pageSize).toBe(PAGE_SIZE)
		expect(props.pageCount).toBe(2)
	})
})

describe('Pagination — client-side totals are known', () => {
	it('reports the full row count, not the current page length', () => {
		const { props } = captureProps({ pagination: { pageSize: PAGE_SIZE } })
		expect(props.rowCount).toBe(USERS.length)
		expect(props.pageCount).toBe(5)
	})
})

describe('Pagination — manual pagination normalizes unknown totals', () => {
	it('surfaces a consumer-supplied rowCount', () => {
		const { props } = captureProps(
			{ pagination: { manual: true, pageSize: PAGE_SIZE, rowCount: 500 } },
			USERS.slice(0, 10),
		)
		expect(props.rowCount).toBe(500)
		expect(props.pageCount).toBe(50)
	})

	// Regression: `getRowCount()` falls back to the *loaded page* length under manual
	// pagination, which the old `rawRowCount > 0` check mistook for a real total and turned
	// into the inverted range "21–10 of 10".
	it('reports rowCount as unknown rather than echoing the loaded page length', () => {
		const { props } = captureProps(
			{ pagination: { manual: true, pageSize: PAGE_SIZE, pageCount: 5 } },
			USERS.slice(0, PAGE_SIZE),
		)
		expect(props.rowCount).toBeUndefined()
		expect(props.pageCount).toBe(5)
	})

	// Regression: the UNKNOWN_PAGE_COUNT (-1) sentinel reached the kits and rendered as
	// the literal user-visible text "Page 1 of -1".
	it('normalizes the unknown-page-count sentinel to undefined', () => {
		const { props } = captureProps({ pagination: { manual: true, pageSize: PAGE_SIZE } }, USERS.slice(0, PAGE_SIZE))
		expect(UNKNOWN_PAGE_COUNT).toBe(-1)
		expect(props.pageCount).toBeUndefined()
		expect(props.rowCount).toBeUndefined()
	})

	// Asserting on the resulting pageIndex would be unfalsifiable: core clamps setPageIndex
	// (`Math.max(0, Math.min(i, maxPageIndex))`), so the old `setPageIndex(-2)` already landed
	// on 0. Assert the nonsensical call is not made at all.
	it('onLastPage does not seek a last page that is unknown', () => {
		const { props, table } = captureProps(
			{ pagination: { manual: true, pageSize: PAGE_SIZE } },
			USERS.slice(0, PAGE_SIZE),
		)
		const setPageIndex = vi.spyOn(table, 'setPageIndex')

		props.onLastPage()

		expect(setPageIndex).not.toHaveBeenCalled()
	})

	it('onLastPage seeks the last page when the page count is known', () => {
		const { props, table } = captureProps({ pagination: { manual: true, pageSize: PAGE_SIZE, pageCount: 5 } })
		const setPageIndex = vi.spyOn(table, 'setPageIndex')

		props.onLastPage()

		expect(setPageIndex).toHaveBeenCalledWith(4)
	})
})
