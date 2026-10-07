'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowOrderingFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	// Structural: the grid shell lays out a column grid, so it needs widths, visibility and pin
	// groups whatever else a table registers.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	// The four keyboard consumers this example exists to put in one grid: row reordering
	// (`Alt+Arrow` and the drag handle), sorting (`Enter` / `Space` on the sort trigger), selection
	// (`Space` on a checkbox) and — in a kit that takes the package's focus model — arrow-key
	// navigation, which needs no feature of its own.
	rowOrderingFeature,
	rowSortingFeature,
	rowSelectionFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

/**
 * Four keyboard consumers in one grid — the subject of the sensors phase.
 *
 * Sorting, selection, grid navigation and row dragging all read keys from the same elements, and the
 * thing worth proving is not that each works but that **no key does two things**: `Alt+Arrow`
 * reorders a row only while no drag is in flight, arrows move the caret only while no drag is in
 * flight, `Space` on the handle starts a drag while `Space` on a checkbox selects, and `Enter` on the
 * sort trigger sorts without picking anything up.
 *
 * Deliberately **uncontrolled** (`ordering={{ row: true }}`): the grid keeps and renders the order,
 * so the DOM after a keystroke is the committed state. A controlled grid reorders nothing of its own
 * and a spec written against one proves nothing about the keys.
 */
export function KeyboardSensorsExample() {
	return (
		<div className='flex flex-col gap-2'>
			<DataGridDnd
				features={features}
				data={EMPLOYEE_DATA.slice(0, 8)}
				columns={columns}
				getRowId={(row: Employee) => String(row.id)}
				sorting
				selection={{}}
				ordering={{ row: true }}
			/>
		</div>
	)
}
