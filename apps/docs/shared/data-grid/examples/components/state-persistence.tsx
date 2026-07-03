'use client'

import { defineColumns, extractState, parseState, useExtractedState } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type Person = { id: number; name: string; role: string }

const PEOPLE: Person[] = [
	{ id: 1, name: 'Alice', role: 'Engineer' },
	{ id: 2, name: 'Bob', role: 'Designer' },
	{ id: 3, name: 'Carol', role: 'PM' },
]

const columns = defineColumns<Person>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

// A previously-saved value (in a real app this comes from localStorage/URL).
const SAVED = { sorting: [{ id: 'name', desc: false }] }

export function StatePersistenceExample() {
	const [initialState] = useState(() => parseState(SAVED))
	const table = useDataGrid({ data: PEOPLE, columns, sorting: true, filtering: true, initialState })
	const persisted = useExtractedState(table, { keys: ['sorting', 'columnFilters', 'pagination'] })

	return (
		<div>
			<DataGrid table={table} />
			<pre>{JSON.stringify(persisted, null, 2)}</pre>
			<p>Snapshot for storage: {JSON.stringify(extractState(table.table))}</p>
		</div>
	)
}
