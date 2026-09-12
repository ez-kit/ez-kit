'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'
import type { RowMove } from '@ez-kit/data-grid-react'

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

/**
 * Uncontrolled: the grid keeps the order the user arranges and renders it.
 *
 * `getRowId` is what the order is recorded as, so it has to be stable — without one, a row id
 * falls back to its index and the order would refer to whichever rows later sit there.
 */
export function RowOrderingExample() {
	return (
		<DataGrid
			data={EMPLOYEE_DATA}
			columns={columns}
			getRowId={(row) => String(row.id)}
			ordering={{ row: true }}
		/>
	)
}

/** `data` with `move` applied — the row lifted out and dropped where its target sits. */
function withMove(rows: Employee[], move: RowMove): Employee[] {
	const from = rows.findIndex((row) => String(row.id) === move.rowId)
	const to = rows.findIndex((row) => String(row.id) === move.targetRowId)
	if (from === -1 || to === -1) return rows

	const next = [...rows]
	const [moved] = next.splice(from, 1)
	if (moved) next.splice(to, 0, moved)
	return next
}

/**
 * Controlled: supplying `onChange` hands the order back to the application.
 *
 * The grid then stores nothing and reorders nothing — it reports one move, and this component
 * decides what that means. A server-backed list would `PATCH` the position here instead.
 */
export function RowOrderingControlledExample() {
	const [rows, setRows] = useState(EMPLOYEE_DATA)

	return (
		<DataGrid
			data={rows}
			columns={columns}
			getRowId={(row) => String(row.id)}
			ordering={{
				row: {
					onChange: (move) => {
						setRows((current) => withMove(current, move))
					},
				},
			}}
		/>
	)
}
