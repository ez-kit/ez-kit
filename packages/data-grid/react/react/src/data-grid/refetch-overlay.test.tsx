import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGridInstance } from '../data-grid-instance'
import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { LoadingState } from '@ez-kit/data-grid-core'

type Row = { id: number; name: string }

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'id', header: 'ID' },
	{ accessorKey: 'name', header: 'Name' },
])

/**
 * Builds an instance whose loading status is seeded into the controlled
 * `state.loading` slice (RQ-mirror shape) via `initialState`. Visibility of the
 * refetch overlay is derived by the grid from these flags — there is no imperative
 * setter; the value is a static, fully controlled seed for each rendered case.
 */
function makeInstance(overrides?: { loading?: Partial<LoadingState>; data?: Row[] }) {
	const { loading = {}, data = DATA } = overrides ?? {}
	const table = createTable<Row>({
		data,
		columns: COLUMNS,
		initialState: {
			loading: { isPending: false, isFetching: false, isError: false, error: null, ...loading },
		},
	})
	return createDataGridInstance(table)
}

describe('RefetchOverlay visibility predicate', () => {
	it('initial load (isPending=true) → shows loading skeleton, NOT the refetch overlay', () => {
		const instance = makeInstance({ loading: { isPending: true, isFetching: false } })
		renderWithComponents(<DataGrid table={instance} />)

		// Loading skeleton is present (LoadingRow renders "Loading…" via TestLoadingRow — 5 rows)
		expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
		// Refetch overlay must NOT be present
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
	})

	it('refetch with existing rows (isFetching=true, isPending=false, rows>0) → shows refetch overlay', () => {
		const instance = makeInstance({ loading: { isFetching: true, isPending: false }, data: DATA })
		renderWithComponents(<DataGrid table={instance} />)

		// Overlay is shown; rows should still be in the DOM
		expect(screen.getByTestId('refetch-overlay')).toBeInTheDocument()
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('idle (isFetching=false, isPending=false) → shows rows only, no overlay and no skeleton', () => {
		const instance = makeInstance({ loading: { isFetching: false, isPending: false } })
		renderWithComponents(<DataGrid table={instance} />)

		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
		expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
	})

	it('isFetching with isPending=true → skeleton path wins (no overlay even with rows in data)', () => {
		// Edge case: both flags true at once — isPending takes priority → skeleton, not overlay
		const instance = makeInstance({ loading: { isFetching: true, isPending: true } })
		renderWithComponents(<DataGrid table={instance} />)

		expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
	})

	it('refetch with empty rows → overlay NOT shown (no rows to dim)', () => {
		const instance = makeInstance({ loading: { isFetching: true, isPending: false }, data: [] })
		renderWithComponents(<DataGrid table={instance} />)

		// No rows → empty state shown, but no refetch overlay
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
	})
})
