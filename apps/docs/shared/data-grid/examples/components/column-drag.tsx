'use client'

import {
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns, DataGrid } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { ColumnDragHandle } from 'shared/data-grid-dnd/handle'
import { DataGridDnd } from 'shared/DataGridDnd'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	// Structural: the grid shell lays out a column grid, so it needs widths, visibility and pin
	// groups whatever else a table registers.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnOrderingFeature,
	// The resizer is here so the spec can prove it still resizes with a drag handle in the same
	// header cell: the drag's activator is the handle element and nothing else, which is what keeps
	// the two gestures apart.
	columnResizingFeature,
})

/**
 * Three leaves under `Details` and one under `Money`, so the example carries both cases a drag has
 * to get right: a move **within** a group, and a drop **across** one, which `dropColumn` refuses on
 * release because a leaf may not change its header group.
 *
 * `id` is locked with `ordering: false`, which makes it a *disabled participant*: it takes part in
 * the drag's index space — it must, or the space has a hole and nothing commits — and cannot be
 * picked up.
 */
const columns = createColumns<Employee>([
	// Grouped, alone, rather than left at the top level beside the groups: a top-level leaf in a
	// grouped header renders **twice** — the real header in the leaf row and a placeholder spanning
	// the rows above it — and both carry `data-column-id`, which makes the rendered order ambiguous
	// to read. Every leaf under a group appears exactly once.
	{ header: 'Ref', columns: [{ accessorKey: 'id', header: 'Id', width: 80, ordering: false }] },
	{
		header: 'Details',
		columns: [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'department', header: 'Department' },
			{ accessorKey: 'joinedAt', header: 'Joined' },
		],
	},
	{ header: 'Money', columns: [{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } }] },
] as never)

/**
 * A grid whose header cells carry a drag handle beside their label.
 *
 * The handle goes in a `<DataGrid.HeaderCell>` render function, which is the ordinary door for this
 * axis: a column's own `header` content renders **inside** the sort trigger's `<button>`, and a
 * control cannot live there — a nested button is invalid HTML. The render function hands back the
 * cell's parts, so a control can sit outside `sortTrigger`.
 *
 * It renders the **kit's** `<ColumnDragHandle />` rather than the `dragHandle` the render arguments
 * also offer, and the difference is the glyph: `dragHandle` is the shared control, which authors no
 * visual because nothing in `@ez-kit/data-grid-react` may, so it comes out as an empty (if
 * perfectly draggable) button. Each kit wraps it with a grip. Reach for `dragHandle` when the call
 * site supplies its own content or does not care; reach for the kit's component to get the kit's
 * look. Both are the same handle on the same sortable — one reads the context the other publishes.
 *
 * `ordering.column.onChange` is not what switches the feature on — the grid keeps the `columnOrder`
 * slice either way — it is how this example counts commits for the spec.
 */
function ColumnDragGrid({ rtl }: { rtl?: boolean }) {
	const [moves, setMoves] = useState(0)

	return (
		<div className='flex flex-col gap-2'>
			{/* The spec reads this: one drag must produce exactly one commit. */}
			<span data-testid='column-drag-commits'>{moves}</span>
			<DataGridDnd
				features={features}
				data={EMPLOYEE_DATA.slice(0, 5)}
				columns={columns}
				getRowId={(row: Employee) => String(row.id)}
				{...(rtl ? { direction: 'rtl' } : {})}
				resizing
				ordering={{
					column: {
						onChange: () => {
							setMoves((count) => count + 1)
						},
					},
				}}
			>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<DataGrid.HeaderRow
									key={group.id}
									headerGroup={group}
								>
									{({ headers }) =>
										headers.map((header) => (
											<DataGrid.HeaderCell
												key={header.id}
												header={header}
											>
												{({ sortTrigger, menu }) => (
													<DataGrid.HeaderMain>
														<ColumnDragHandle />
														{sortTrigger}
														{menu}
													</DataGrid.HeaderMain>
												)}
											</DataGrid.HeaderCell>
										))
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGridDnd>
		</div>
	)
}

export function ColumnDragExample() {
	return <ColumnDragGrid />
}

/**
 * The same grid under RTL.
 *
 * `dir` on an ancestor is what makes the browser resolve the inline axis the other way round, and
 * `direction: 'rtl'` is what tells the grid which direction it is laid out in — the pair the column
 * pinning RTL example already establishes. The drag's own geometry is direction-agnostic, which is
 * the claim the spec checks rather than assumes.
 */
export function ColumnDragRtlExample() {
	return (
		<div dir='rtl'>
			<ColumnDragGrid rtl />
		</div>
	)
}
