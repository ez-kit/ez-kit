'use client'

import { createColumnHelper } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid, useDataGrid } from 'shared/data-grid/CustomGrid'

import type { ColumnDef } from '@ez-kit/data-grid-react'

// ── data ─────────────────────────────────────────────────────────────────────

type Employee = {
	id: number
	name: string
	department: string
	score: number
	active: boolean
	rating: number
}

const EMPLOYEE_DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', score: 78, active: true, rating: 5 },
	{ id: 2, name: 'Bob Smith', department: 'Design', score: 45, active: false, rating: 3 },
	{ id: 3, name: 'Carol White', department: 'Marketing', score: 92, active: true, rating: 4 },
	{ id: 4, name: 'Dave Brown', department: 'Engineering', score: 60, active: true, rating: 2 },
	{ id: 5, name: 'Eve Davis', department: 'Sales', score: 88, active: false, rating: 5 },
]

// ── Example 1: base createColumnHelper (built-in types) ───────────────────────

const baseHelper = createColumnHelper<Employee>()

const baseColumns = [
	baseHelper.text({ accessorKey: 'name', header: 'Name' }),
	baseHelper.text({ accessorKey: 'department', header: 'Department' }),
	baseHelper.progress({ accessorKey: 'score', header: 'Score %', config: { max: 100 } }),
	baseHelper.boolean({ accessorKey: 'active', header: 'Active' }),
]

export function ColumnHelperBaseExample() {
	const [data] = useState(EMPLOYEE_DATA)
	const table = useDataGrid({ data, columns: baseColumns, sorting: true })

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Built-in types via <code>createColumnHelper&lt;Employee&gt;()</code>.
			</p>
			<CustomDataGrid table={table} />
		</div>
	)
}

// ── Example 2: custom() — inherit type, override view ────────────────────────

function StarRatingView({ value }: { value: unknown }) {
	const count = typeof value === 'number' ? value : 0
	return (
		<span style={{ color: '#f59e0b', letterSpacing: 2 }}>
			{'★'.repeat(count)}
			{'☆'.repeat(5 - count)}
		</span>
	)
}

const customViewHelper = createColumnHelper<Employee>()

const customViewColumns = [
	customViewHelper.text({ accessorKey: 'name', header: 'Name' }),
	customViewHelper.text({ accessorKey: 'department', header: 'Department' }),
	customViewHelper.custom({
		accessorKey: 'rating',
		header: 'Rating',
		type: 'number',
		view: StarRatingView,
	}),
]

export function ColumnHelperCustomViewExample() {
	const [data] = useState(EMPLOYEE_DATA)
	const table = useDataGrid({ data, columns: customViewColumns, sorting: true })

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				<code>helper.custom()</code> inherits <code>number</code> type behavior with a custom star-rating view.
			</p>
			<CustomDataGrid table={table} />
		</div>
	)
}

// ── Example 3: registered custom types (from extendDataGrid) ─────────────────

// The custom grid registers 'rating' and 'color' via extendDataGrid().
// Passing both type params gives type-safe named methods on the helper.
const registeredHelper = createColumnHelper<Employee, 'rating' | 'color'>(['rating', 'color'])

const registeredColumns = [
	registeredHelper.text({ accessorKey: 'name', header: 'Name' }),
	registeredHelper.text({ accessorKey: 'department', header: 'Department' }),
	registeredHelper.rating({ accessorKey: 'rating', header: 'Rating' }),
]

export function ColumnHelperRegisteredExample() {
	const [data] = useState(EMPLOYEE_DATA)
	const table = useDataGrid({ data, columns: registeredColumns as ColumnDef<Employee>[], sorting: true })

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Named method <code>helper.rating()</code> for a type registered via <code>extendDataGrid()</code>.
			</p>
			<CustomDataGrid table={table} />
		</div>
	)
}
