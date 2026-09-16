/**
 * An expanded parent keeps its children when it moves — at the model **and** in the DOM.
 *
 * Written while diagnosing a browser failure on `ordering/rows.spec.ts`, where the same gesture
 * left `["2","1"]` rendered instead of `["2","1","11","12"]`. It does **not** reproduce here: the
 * row order, the expanded row model and the rendered rows are all correct, under the failing
 * example's exact feature set — pagination included. Kept anyway, because it pins the half of the
 * behaviour this package owns, and because the next person to read that spec failure should be
 * able to see at a glance that the model is not the suspect.
 *
 * `findNeighbour` is what makes this non-trivial: rows deeper than the mover are stepped over
 * rather than treated as a boundary, so an expanded parent reaches the sibling *below its own
 * children* rather than freezing in place.
 */
import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createPaginatedRowModel,
	rowExpandingFeature,
	rowOrderingFeature,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { DataTable, GridFeatures } from '../types'

type Team = { id: number; name: string; members?: Team[] }

const DATA: Team[] = [
	{
		id: 1,
		name: 'Frontend',
		members: [
			{ id: 11, name: 'Alice' },
			{ id: 12, name: 'Tom' },
		],
	},
	{
		id: 2,
		name: 'Backend',
		members: [
			{ id: 21, name: 'Carlos' },
			{ id: 22, name: 'Sara' },
		],
	},
]

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowExpandingFeature,
	rowOrderingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
}) as unknown as GridFeatures

describe('tree + row ordering', () => {
	it('keeps the children rendered after the parent moves', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, Team>({
				features,
				data: DATA,
				columns: [{ accessorKey: 'name', header: 'Name' }],
				getRowId: (row) => String(row.id),
				ordering: { row: true },
				expanding: { mode: 'tree', getSubRows: (row) => row.members },
			}),
		)
		const ids = () => result.current.getRowModel().rows.map((r) => r.id)

		act(() => {
			result.current.setExpanded({ '1': true })
		})
		expect(ids()).toEqual(['1', '11', '12', '2'])

		act(() => {
			result.current.ordering.moveRow('1', 'down')
		})
		expect(ids()).toEqual(['2', '1', '11', '12'])
	})
})

describe('tree + row ordering, through the DOM', () => {
	it('keeps the children rendered after the parent moves', () => {
		// Wrapper object, not a bare `let`: the same shape `renderGrid` uses, so the table can be
		// read after render without a non-null assertion at every call site.
		const ref: { table: DataTable<GridFeatures, Team> | null } = { table: null }
		function Harness() {
			ref.table = useDataGrid<GridFeatures, Team>({
				features,
				data: DATA,
				columns: [{ accessorKey: 'name', header: 'Name' }],
				getRowId: (row) => String(row.id),
				ordering: { row: true },
				expanding: { mode: 'tree', getSubRows: (row) => row.members },
			})
			return <DataGrid table={ref.table} />
		}
		const { container } = renderWithComponents(<Harness />)
		const domIds = () =>
			[...container.querySelectorAll("[data-slot='tbody'] [data-slot='tr'][data-row-id]")].map((el) =>
				el.getAttribute('data-row-id'),
			)

		const live = (): DataTable<GridFeatures, Team> => {
			if (!ref.table) throw new Error('the harness did not render')
			return ref.table
		}

		act(() => {
			live().setExpanded({ '1': true })
		})
		expect(domIds()).toEqual(['1', '11', '12', '2'])

		act(() => {
			live().ordering.moveRow('1', 'down')
		})
		expect(domIds()).toEqual(['2', '1', '11', '12'])
	})
})
