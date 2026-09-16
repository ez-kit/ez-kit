'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	rowExpandingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import type { GridFeatures, TableState } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

type Employee = {
	id: number
	name: string
	role: string
	department: string
	notes: string
}

const EMPLOYEES: Employee[] = [
	{
		id: 1,
		name: 'Alice Johnson',
		role: 'Senior Engineer',
		department: 'Engineering',
		notes: 'On-call rotation lead. Prefers async communication.',
	},
	{
		id: 2,
		name: 'Bob Smith',
		role: 'Product Manager',
		department: 'Product',
		notes: 'Owns the roadmap for Q3. Weekly sync every Tuesday.',
	},
	{
		id: 3,
		name: 'Carol White',
		role: 'Designer',
		department: 'Design',
		notes: 'Design system maintainer. Figma token updates in progress.',
	},
	{
		id: 4,
		name: 'Dave Brown',
		role: 'Data Analyst',
		department: 'Analytics',
		notes: 'Monthly reporting due on the 5th. Warehouse access required.',
	},
]

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
	{ accessorKey: 'department', header: 'Department' },
])

export function ExpandingControlledExample() {
	const [tableState, setTableState] = useState<Partial<TableState<GridFeatures>>>({ expanded: {} })
	const expanded = (tableState.expanded ?? {}) as Record<string, boolean>
	// The grid keys a row by its `id` field when the data has one, falling back to the index —
	// so these are `'1'`…`'4'`, not `'0'`…`'3'`. Building them from the index instead left the
	// last row closed behind "Expand all" and an id in the map that matched no row at all.
	const allIds = EMPLOYEES.map((employee) => String(employee.id))
	const allExpanded = allIds.every((id) => expanded[id])

	return (
		<div>
			<div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
				<button
					type='button'
					onClick={() => {
						setTableState((prev) => ({
							...prev,
							expanded: Object.fromEntries(allIds.map((id) => [id, true])),
						}))
					}}
					disabled={allExpanded}
				>
					Expand all
				</button>
				<button
					type='button'
					onClick={() => {
						setTableState((prev) => ({ ...prev, expanded: {} }))
					}}
					disabled={Object.keys(expanded).length === 0}
				>
					Collapse all
				</button>
			</div>
			<DataGrid
				features={features}
				data={EMPLOYEES}
				columns={columns}
				state={tableState}
				onStateChange={(nextState) => {
					setTableState(nextState)
				}}
				expanding={{
					component: ({ row }) => (
						<div>
							<span style={{ fontWeight: 600 }}>Notes: </span>
							{row.original.notes}
						</div>
					),
				}}
			/>
		</div>
	)
}
