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

type Team = {
	id: number
	name: string
	department: string
	members?: Team[]
}

const TEAM_DATA: Team[] = [
	{
		id: 1,
		name: 'Frontend',
		department: 'Engineering',
		members: [
			{ id: 11, name: 'Alice Johnson', department: 'Engineering' },
			{ id: 12, name: 'Tom Lee', department: 'Engineering' },
		],
	},
	{
		id: 2,
		name: 'Backend',
		department: 'Engineering',
		members: [
			{ id: 21, name: 'Carlos Mendez', department: 'Engineering' },
			{ id: 22, name: 'Sara Kim', department: 'Engineering' },
		],
	},
]

const teamColumns = createColumns<Team>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
])

/**
 * Uncontrolled, with pagination: the order spans the whole list, not the page on screen.
 *
 * A move is defined over the rows the user can see — the arrows are disabled at a page edge —
 * but what the grid records is the order of every row it holds, so a move made on one page does
 * not strand the rows on the others.
 */
export function RowOrderingPaginatedExample() {
	return (
		<DataGrid
			data={EMPLOYEE_DATA}
			columns={columns}
			getRowId={(row) => String(row.id)}
			ordering={{ row: true }}
			pagination={{ pageSize: 4 }}
		/>
	)
}

/**
 * Uncontrolled, with tree data: a row moves among its siblings.
 *
 * An expanded parent steps over its own children to reach the sibling below them. Its children
 * cannot move here at all — the order the grid keeps is a list of ids over the top-level array,
 * and a child's position lives inside its parent, so those entries are disabled. Controlled mode
 * reports a sub-row move like any other.
 */
export function RowOrderingTreeExample() {
	return (
		<DataGrid
			data={TEAM_DATA}
			columns={teamColumns}
			getRowId={(row) => String(row.id)}
			ordering={{ row: true }}
			expanding={{ mode: 'tree', getSubRows: (row) => row.members }}
		/>
	)
}
