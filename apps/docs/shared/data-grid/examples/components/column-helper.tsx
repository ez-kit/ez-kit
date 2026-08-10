'use client'

import { createColumnHelper } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid } from 'shared/data-grid/CustomGrid'

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

const createColumn = createColumnHelper<Employee>()

// ── Example 1: base createColumnHelper (built-in types) ───────────────────────

const baseColumns = [
	createColumn.text({ accessorKey: 'name', header: 'Name' }),
	createColumn.text({ accessorKey: 'department', header: 'Department' }),
	createColumn.progress({ accessorKey: 'score', header: 'Score %', config: { max: 100 } }),
	createColumn.boolean({ accessorKey: 'active', header: 'Active' }),
]

export function ColumnHelperBaseExample() {
	const [data] = useState(EMPLOYEE_DATA)

	return (
		<CustomDataGrid
			data={data}
			columns={baseColumns}
			sorting
		/>
	)
}

// ── Example 2: custom() — inherit type, override view ────────────────────────

const MAX_RATING = 5
const STAR_COLOR = '#f59e0b'
const STAR_FILLED = '★'
const STAR_EMPTY = '☆'
const STAR_LETTER_SPACING = 2

function StarRatingView({ value }: { value: unknown }) {
	const count = typeof value === 'number' ? value : 0
	return (
		<span style={{ color: STAR_COLOR, letterSpacing: STAR_LETTER_SPACING }}>
			{STAR_FILLED.repeat(count)}
			{STAR_EMPTY.repeat(MAX_RATING - count)}
		</span>
	)
}

const customViewColumns = [
	createColumn.text({ accessorKey: 'name', header: 'Name' }),
	createColumn.text({ accessorKey: 'department', header: 'Department' }),
	createColumn.custom({
		accessorKey: 'rating',
		header: 'Rating',
		type: 'number',
		view: StarRatingView,
	}),
]

export function ColumnHelperCustomViewExample() {
	const [data] = useState(EMPLOYEE_DATA)

	return (
		<CustomDataGrid
			data={data}
			columns={customViewColumns}
			sorting
		/>
	)
}
