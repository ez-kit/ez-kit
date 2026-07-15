import { defineColumns, UNKNOWN_PAGE_COUNT } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { renderWithComponents } from '../test-utils'
import { PaginationVariant } from '../types'
import { useDataGrid } from '../use-data-grid'

import { Pagination } from './pagination'
import { TableContext } from './table-context'

import type { PaginationProps } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const PAGE_SIZE = 10
const USERS: User[] = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `User ${String(i + 1)}` }))
const COLUMNS = defineColumns<User>([{ accessorKey: 'name' }])

/**
 * Render the real `Pagination` against a real grid instance and capture the props it hands
 * to the UI kit. This is the seam the kits consume, so it is where the "unknown total"
 * normalization has to hold.
 */
function captureProps(config: Omit<UseDataGridConfig<User>, 'data' | 'columns'>, data: User[] = USERS): PaginationProps {
	let captured: PaginationProps | undefined
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

	if (!captured) throw new Error('Pagination did not render')
	return captured
}

describe('Pagination — variant plumbing', () => {
	it('passes the configured variant through to the UI kit', () => {
		const props = captureProps({ pagination: { pageSize: PAGE_SIZE, variant: PaginationVariant.Compact } })
		expect(props.variant).toBe(PaginationVariant.Compact)
	})

	it('defaults to the numbered variant', () => {
		const props = captureProps({ pagination: true })
		expect(props.variant).toBe(PaginationVariant.Numbered)
	})

	it('passes the real pageSize, not one derived from rowCount ÷ pageCount', () => {
		// 11 rows @ pageSize 10 → 2 pages. The old derivation (ceil(11/2)) reported 6.
		const props = captureProps({ pagination: { pageSize: PAGE_SIZE } }, USERS.slice(0, 11))
		expect(props.pageSize).toBe(PAGE_SIZE)
		expect(props.pageCount).toBe(2)
	})
})

describe('Pagination — client-side totals are known', () => {
	it('reports the full row count, not the current page length', () => {
		const props = captureProps({ pagination: { pageSize: PAGE_SIZE } })
		expect(props.rowCount).toBe(USERS.length)
		expect(props.pageCount).toBe(5)
	})
})

describe('Pagination — manual pagination normalizes unknown totals', () => {
	it('surfaces a consumer-supplied rowCount', () => {
		const props = captureProps({ pagination: { manual: true, pageSize: PAGE_SIZE, rowCount: 500 } }, USERS.slice(0, 10))
		expect(props.rowCount).toBe(500)
		expect(props.pageCount).toBe(50)
	})

	// Regression: `getRowCount()` falls back to the *loaded page* length under manual
	// pagination, which the old `rawRowCount > 0` check mistook for a real total and turned
	// into the inverted range "21–10 of 10".
	it('reports rowCount as unknown rather than echoing the loaded page length', () => {
		const props = captureProps(
			{ pagination: { manual: true, pageSize: PAGE_SIZE, pageCount: 5 } },
			USERS.slice(0, PAGE_SIZE),
		)
		expect(props.rowCount).toBeUndefined()
		expect(props.pageCount).toBe(5)
	})

	// Regression: the UNKNOWN_PAGE_COUNT (-1) sentinel reached the kits and rendered as
	// the literal user-visible text "Page 1 of -1".
	it('normalizes the unknown-page-count sentinel to undefined', () => {
		const props = captureProps({ pagination: { manual: true, pageSize: PAGE_SIZE } }, USERS.slice(0, PAGE_SIZE))
		expect(UNKNOWN_PAGE_COUNT).toBe(-1)
		expect(props.pageCount).toBeUndefined()
		expect(props.rowCount).toBeUndefined()
	})

	it('onLastPage is inert when there is no known last page', () => {
		const props = captureProps({ pagination: { manual: true, pageSize: PAGE_SIZE } }, USERS.slice(0, PAGE_SIZE))

		// Previously this called setPageIndex(pageCount - 1) → setPageIndex(-2).
		expect(() => {
			props.onLastPage()
		}).not.toThrow()
		expect(props.pageIndex).toBe(0)
	})
})
