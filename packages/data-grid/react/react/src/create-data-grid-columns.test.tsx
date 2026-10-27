import { createColumns } from '@ez-kit/data-grid-core'
import { render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { baseCellTypes } from './cell-types'
import { defineCellType } from './cell-types-context'
import { createDataGrid } from './create-data-grid'
import { DataGrid as BareDataGrid } from './data-grid/data-grid'
import { createColumns as createReactColumns } from './react-columns'
import { TEST_FEATURES, testComponents } from './test-utils'

import type { ColumnDef } from './react-columns'
import type { BadgeCellConfig, BadgeColumnConfig } from '@ez-kit/data-grid-core'

// The bundle checks every column it is handed against its own registry, widened only by the
// grid's own `cellTypes` — see ADR 0016. Most cases below are compile-time: a `@ts-expect-error`
// that stops being an error fails the package's typecheck.

type Row = { id: number; name: string; score: number }
const ROWS: Row[] = [
	{ id: 1, name: 'Alice', score: 3 },
	{ id: 2, name: 'Bob', score: 5 },
]

type BadgeSize = 'sm' | 'md'
const BADGE_ITEMS = [{ value: 'a', label: 'A' }]

const bundleCellTypes = {
	...baseCellTypes,
	badge: defineCellType<BadgeCellConfig & { size?: BadgeSize }, BadgeColumnConfig & { size?: BadgeSize }>()({}),
}
const bundle = createDataGrid({ components: testComponents, features: TEST_FEATURES, cellTypes: bundleCellTypes })

const ratingCellType = defineCellType<{ max: number }>()({ view: () => null })

describe('bundle columns: cell type ids and config', () => {
	it('rejects an unknown cell type id written inline', () => {
		const { result } = renderHook(() =>
			bundle.useDataGrid({
				data: ROWS,
				columns: [
					{ accessorKey: 'name', cell: 'text' },
					// @ts-expect-error `nosuch` is registered neither in the bundle nor on this grid
					{ accessorKey: 'name', cell: { type: 'nosuch' } },
				],
			}),
		)
		expect(result.current.getAllLeafColumns()).toHaveLength(2)
	})

	it('rejects a config key the type does not declare', () => {
		const grid = (
			<bundle.DataGrid
				data={ROWS}
				columns={[
					{ accessorKey: 'score', cell: { type: 'number', config: { decimals: 1 } } },
					// @ts-expect-error `NumberCellConfig` declares no `nope`
					{ accessorKey: 'score', cell: { type: 'number', config: { nope: 1 } } },
				]}
			/>
		)
		expect(grid).toBeTruthy()
	})

	it('checks an extended built-in config field', () => {
		const accepted = (
			<bundle.DataGrid
				data={ROWS}
				columns={[{ accessorKey: 'name', cell: { type: 'badge', config: { items: BADGE_ITEMS, size: 'sm' } } }]}
			/>
		)
		const rejected = (
			<bundle.DataGrid
				data={ROWS}
				// @ts-expect-error `size` is `'sm' | 'md'`
				columns={[{ accessorKey: 'name', cell: { type: 'badge', config: { items: BADGE_ITEMS, size: 'xl' } } }]}
			/>
		)
		expect([accepted, rejected]).toHaveLength(2)
	})
})

describe('bundle columns: per-grid cellTypes', () => {
	it('accepts an id registered on this grid alone', () => {
		render(
			<bundle.DataGrid
				data={ROWS}
				cellTypes={{ rating: ratingCellType }}
				columns={[
					{ accessorKey: 'name', header: 'Name' },
					{ accessorKey: 'score', cell: { type: 'rating', config: { max: 5 } } },
				]}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('widens the hook the same way', () => {
		const { result } = renderHook(() =>
			bundle.useDataGrid({
				data: ROWS,
				cellTypes: { rating: ratingCellType },
				columns: [{ accessorKey: 'score', cell: { type: 'rating', config: { max: 5 } } }],
			}),
		)
		expect(result.current.getAllLeafColumns()).toHaveLength(1)
	})

	it('does not let a column register its own id', () => {
		const grid = (
			<bundle.DataGrid
				data={ROWS}
				cellTypes={{ rating: ratingCellType }}
				// @ts-expect-error the grid's `cellTypes` has no `nosuch`, and naming it does not add it
				columns={[{ accessorKey: 'score', cell: { type: 'nosuch' } }]}
			/>
		)
		expect(grid).toBeTruthy()
	})
})

describe('bundle columns: a bundle without a feature set', () => {
	const featureless = createDataGrid({ components: testComponents, cellTypes: bundleCellTypes })

	it('checks its inline columns the same way', () => {
		const grid = (
			<featureless.DataGrid
				features={TEST_FEATURES}
				data={ROWS}
				// @ts-expect-error `nosuch` is not in this bundle's registry
				columns={[{ accessorKey: 'name', cell: { type: 'nosuch' } }]}
			/>
		)
		expect(grid).toBeTruthy()
	})

	it('widens its hook through the grid’s own cellTypes', () => {
		const { result } = renderHook(() =>
			featureless.useDataGrid({
				features: TEST_FEATURES,
				data: ROWS,
				cellTypes: { rating: ratingCellType },
				columns: [{ accessorKey: 'score', cell: { type: 'rating', config: { max: 5 } } }],
			}),
		)
		expect(result.current.getAllLeafColumns()).toHaveLength(1)
	})
})

describe('bundle columns: row type', () => {
	it('infers the row type from data', () => {
		const { result } = renderHook(() => bundle.useDataGrid({ data: ROWS, columns: [{ accessorKey: 'name' }] }))
		const first: Row | undefined = result.current.getRowModel().rows[0]?.original
		expect(first?.name).toBe('Alice')
	})

	it('rejects a misspelled accessor key', () => {
		const grid = (
			<bundle.DataGrid
				data={ROWS}
				// @ts-expect-error `Row` has `name`, not `nam`
				columns={[{ accessorKey: 'nam' }]}
			/>
		)
		expect(grid).toBeTruthy()
	})

	it('types a view component value by its accessor', () => {
		render(
			<bundle.DataGrid
				data={ROWS}
				columns={[{ accessorKey: 'score', cell: { component: ({ value }) => <b>{value.toFixed(1)}</b> } }]}
			/>,
		)
		expect(screen.getByText('3.0')).toBeInTheDocument()
	})
})

describe('bundle columns: builder output', () => {
	it('accepts columns from the unbound builder when the bundle holds every base type', () => {
		render(
			<bundle.DataGrid
				data={ROWS}
				columns={createColumns<Row>([{ accessorKey: 'name', cell: 'text' }])}
			/>,
		)
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('rejects columns built against a registry the grid does not have', () => {
		const foreign = createReactColumns<Row, typeof bundleCellTypes & { rating: typeof ratingCellType }>([
			{ accessorKey: 'score', cell: { type: 'rating', config: { max: 5 } } },
		])
		const rejected = (
			<bundle.DataGrid
				data={ROWS}
				// @ts-expect-error the bundle registers no `rating`, and this grid passes no `cellTypes`
				columns={foreign}
			/>
		)
		const widened = (
			<bundle.DataGrid
				data={ROWS}
				cellTypes={{ rating: ratingCellType }}
				columns={foreign}
			/>
		)
		expect([rejected, widened]).toHaveLength(2)
	})
})

describe('bare package grid', () => {
	it('does not check cell types, which a provider registers at runtime', () => {
		const grid = (
			<BareDataGrid
				features={TEST_FEATURES}
				data={ROWS}
				columns={[{ accessorKey: 'name', cell: { type: 'status' } }]}
			/>
		)
		expect(grid).toBeTruthy()
	})
})

describe('runtime', () => {
	it('renders the raw value of a cell type nobody registered', () => {
		const unchecked = [{ accessorKey: 'name', cell: { type: 'nosuch' } }] as unknown as ColumnDef<Row>[]
		render(
			<bundle.DataGrid
				data={ROWS}
				columns={unchecked}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})
})
