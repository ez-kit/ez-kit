'use client'

import {
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createSortedRowModel,
	filterFns,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns, extractState, parseState, useExtractedState } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	rowSortingFeature,
	// `columnOrder` is in the snapshot `extractState` returns, and a slice only exists when its
	// feature is registered — so persisting column order means registering the feature, even
	// though this grid never writes an `ordering` option.
	columnOrderingFeature,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
})

type Person = { id: number; name: string; role: string }

const PEOPLE: Person[] = [
	{ id: 1, name: 'Alice', role: 'Engineer' },
	{ id: 2, name: 'Bob', role: 'Designer' },
	{ id: 3, name: 'Carol', role: 'PM' },
]

const columns = createColumns<Person>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

// A previously-saved value (in a real app this comes from localStorage/URL).
const SAVED = { sorting: [{ id: 'name', desc: false }] }

export function StatePersistenceExample() {
	const [initialState] = useState(() => parseState(SAVED))
	const table = useDataGrid({ features, data: PEOPLE, columns, sorting: true, filtering: true, initialState })
	const persisted = useExtractedState(table, { keys: ['sorting', 'columnFilters', 'pagination'] })

	return (
		<div>
			<DataGrid table={table} />
			<pre>{JSON.stringify(persisted, null, 2)}</pre>
			<p>Snapshot for storage: {JSON.stringify(extractState<typeof features, Person>(table))}</p>
		</div>
	)
}
