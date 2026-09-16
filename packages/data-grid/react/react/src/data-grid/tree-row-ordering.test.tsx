/**
 * An expanded parent keeps its children when it moves — at the model **and** in the DOM.
 *
 * Written while diagnosing a browser failure on `ordering/rows.spec.ts`, where the same gesture
 * left `["2","1"]` rendered instead of `["2","1","11","12"]`.
 *
 * **The first version of this file asserted synchronously after the move and passed, which is
 * why the defect looked browser-only.** It was not. `createCoreRowModel`'s memo is keyed on
 * `options.data`, and an uncontrolled row move rewrites that array; its `onAfterUpdate` then
 * calls `table_autoResetExpanded`, which reaches `table._reactivity.schedule` — a
 * `queueMicrotask`. A synchronous `expect` after a synchronous `act` runs *before* that
 * microtask drains, so it reads the state between the move and the reset and sees nothing
 * wrong. `await act(async () => {})` past the microtask is what makes this test agree with the
 * browser, and is why both cases below are `async`.
 *
 * `useDataGrid` suppresses `autoResetExpanded` (with `autoResetPageIndex` and
 * `autoResetCellSelection`) for exactly the render that projects a row move, so the reorder no
 * longer reads as a new dataset.
 *
 * **The DOM case is the one with teeth.** The model case passes with the suppression removed as
 * well: nothing recomputes the core row model until `ids()` asks for it, so the reset is
 * scheduled *by* the very read being asserted and lands after it — an assertion that causes the
 * thing it is asserting about. Only a rendered grid recomputes on its own and then repaints from
 * the reset state, which is why the browser saw this and a hook-only test could not.
 *
 * So: **do not drop the `await act` from either case, and do not collapse the two into the model
 * one.** Both edits read as tidying and both restore a test that passes whatever the source does.
 * If you are about to make one, delete the suppression in `use-data-grid.ts` first and check this
 * file still fails.
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
	it('keeps the children rendered after the parent moves', async () => {
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
		// The auto-reset this guards against is a queued microtask, so a synchronous assertion
		// here would pass whether or not it is suppressed. Drain the queue first.
		await act(async () => {
			await Promise.resolve()
		})
		expect(ids()).toEqual(['2', '1', '11', '12'])
	})
})

describe('tree + row ordering, through the DOM', () => {
	it('keeps the children rendered after the parent moves', async () => {
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
		await act(async () => {
			await Promise.resolve()
		})
		expect(domIds()).toEqual(['2', '1', '11', '12'])
	})
})
