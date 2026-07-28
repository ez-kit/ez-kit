'use client'

import { createColumnHelper } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid } from 'shared/data-grid/CustomGrid'
import { DataGrid } from 'shared/DataGrid'

import type { CellTypeRegistry, ColumnDef, FieldState } from '@ez-kit/data-grid-react'

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
const STAR_EMPTY_COLOR = '#d1d5db'

function StarRatingView({ value }: { value: unknown }) {
	const count = typeof value === 'number' ? value : 0
	return (
		<span style={{ color: STAR_COLOR, letterSpacing: 2 }}>
			{'★'.repeat(count)}
			{'☆'.repeat(MAX_RATING - count)}
		</span>
	)
}

/** Editing input for the `rating` cell type registered in example 3. */
function StarRatingInput({ value, onChange }: FieldState) {
	const count = typeof value === 'number' ? value : 0
	return (
		<span>
			{Array.from({ length: MAX_RATING }, (_, index) => (
				<button
					type='button'
					key={index}
					onClick={() => {
						onChange(index + 1)
					}}
					style={{
						color: index < count ? STAR_COLOR : STAR_EMPTY_COLOR,
						fontSize: '1.25rem',
						cursor: 'pointer',
						background: 'transparent',
						border: 'none',
						padding: 0,
					}}
				>
					★
				</button>
			))}
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

	return (
		<CustomDataGrid
			data={data}
			columns={customViewColumns}
			sorting
		/>
	)
}

// ── Example 3: registered cell type ──────────────────────────────────────────

// Step 1 — the registry. A cell type is an id mapped to its renderers: `view`
// for display, `edit` for the editing input. This one is registered on the grid
// itself via the `cellTypes` prop below, so everything the example needs is in
// this file. An app registers the same shape once for the whole grid module
// instead — see `extendDataGrid()` on the docs page.
const RATING_CELL_TYPES = {
	rating: { view: StarRatingView, edit: StarRatingInput },
} satisfies CellTypeRegistry

// Step 2 — the helper. The registry is the single source of truth for both the
// type parameter and the runtime ids, so the two can never drift apart.
type RatingCellType = keyof typeof RATING_CELL_TYPES

const registeredHelper = createColumnHelper<Employee, RatingCellType>(
	Object.keys(RATING_CELL_TYPES) as RatingCellType[],
)

// Step 3 — the column. `registeredHelper.rating` exists because 'rating' is a
// key of the registry; it emits `cell: { type: 'rating' }` for you.
const registeredColumns = [
	registeredHelper.text({ accessorKey: 'name', header: 'Name' }),
	registeredHelper.text({ accessorKey: 'department', header: 'Department' }),
	registeredHelper.rating({ accessorKey: 'rating', header: 'Rating' }),
]

export function ColumnHelperRegisteredExample() {
	const [data] = useState(EMPLOYEE_DATA)

	return (
		<DataGrid
			data={data}
			// `columns` is typed `ColumnDef<TRow>[]` — i.e. `TCustom = never` — so a per-grid
			// registered id does not survive the assignment even though `cellTypes` registers it.
			// Columns built by a bundle's own `defineColumns` / `createColumnHelper` need no cast.
			columns={registeredColumns as ColumnDef<Employee>[]}
			cellTypes={RATING_CELL_TYPES}
			sorting
		/>
	)
}
