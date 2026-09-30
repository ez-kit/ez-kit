'use client'

import {
	columnOrderingFeature,
	columnPinningFeature,
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
})

/**
 * `id` is locked with `ordering: false` — a **disabled participant**: it holds its place in the
 * panel's index space, which it must or the space has a hole and nothing commits, and offers no grip.
 */
const columns = createColumns<Employee>([
	{ accessorKey: 'id', header: 'Id', width: 80, ordering: false },
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'joinedAt', header: 'Joined' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
] as never)

/**
 * Reordering columns by dragging them in the **column panel** rather than in the header.
 *
 * Same axis, same `columnOrder` slice, one difference that decides everything: the panel lists the
 * hidden columns too, so its moves are scoped `ColumnMoveScope.All` and its index space is a
 * different list from the header's. `joinedAt` starts hidden here precisely so that shows — it can be
 * dragged in the panel while having no header cell to drag at all.
 *
 * Nothing about the panel is composed at the call site: `<DataGrid.VisibilityTrigger />` renders the
 * kit's own panel, and the kit's panel renders `<DataGrid.VisibilityItem>` per row, which is what
 * registers each row with the adapter. So switching the drag on is the same one thing it is
 * everywhere — `createDataGrid({ dnd: adapter })`, here through `DataGridDnd`.
 *
 * `ordering.column.visibilityMenu` is what turns the Columns toggle into a panel in the first place,
 * and it is a prerequisite: without it the toggle is a checkbox list with no order to read, so there
 * is nothing to drag and no row registers.
 *
 * **The header cells carry a handle too, and that is the point of the example rather than decoration.**
 * The two surfaces share the column axis and keep separate index spaces, and the hazards that split
 * exists to prevent — one space's density killing the other's, and the two registering the same id
 * with the drag library — only exist in a grid that mounts both. Having them here is what surfaced the
 * second one during this phase. Note the spec does **not** drag on both in one run: see its docblock
 * for why neither shape of that case is green in both kits.
 */
export function ColumnPanelDragExample() {
	const [moves, setMoves] = useState(0)

	return (
		<div className='flex flex-col gap-2'>
			{/*
			 * The spec reads the inner span, so its text has to stay the bare number — the label sits
			 * outside it. This example is on a docs page, where a stray `0` above a grid reads as a bug.
			 */}
			<span className='text-sm text-muted-foreground'>
				Columns moved <span data-testid='column-panel-drag-commits'>{moves}</span>
			</span>
			<DataGridDnd
				features={features}
				data={EMPLOYEE_DATA.slice(0, 5)}
				columns={columns}
				getRowId={(row: Employee) => String(row.id)}
				initialState={{ columnVisibility: { joinedAt: false } }}
				ordering={{
					column: {
						visibilityMenu: true,
						onChange: () => {
							setMoves((count) => count + 1)
						},
					},
				}}
			>
				<DataGrid.Toolbar end={<DataGrid.VisibilityTrigger />} />
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
