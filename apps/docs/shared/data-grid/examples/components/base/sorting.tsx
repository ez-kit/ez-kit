'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseSortingExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			pagination={{ pageSize: 10, items: [5, 10, 25] }}
		/>
	)
}

/** Compact live grid shared by both landing page kit previews. */
export function LandingGridExample() {
	const data = useMemo(() => makeUsers(5), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
		/>
	)
}
