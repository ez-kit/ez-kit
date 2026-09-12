'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

import type { RowActionsPlacement } from '@ez-kit/data-grid-react'

/**
 * The same grid under both `rowActions.placement` values, so the two examples below differ by
 * exactly one option and nothing else.
 *
 * Editing, deleting and row pinning are all on: that is what puts three built-in actions in the
 * column, which is the point the option makes.
 */
function PlacementGrid({ placement }: { placement: RowActionsPlacement }) {
	const [data, setData] = useState(() => makeUsers(4))

	return (
		<DataGrid
			data={data}
			columns={columns}
			editing={{ mode: 'modal', onSave: () => Promise.resolve() }}
			pinning={{ row: { top: true, bottom: true } }}
			deleting={{
				onDelete: ({ row }) => {
					setData((rows) => rows.filter((user) => user.id !== row.original.id))
				},
			}}
			rowActions={{ placement }}
		/>
	)
}

/** `placement: 'inline'` — the default. Edit and delete each get their own icon button. */
export function RowActionsInlineExample() {
	return <PlacementGrid placement='inline' />
}

/** `placement: 'menu'` — every action collapses into one overflow trigger. */
export function RowActionsMenuExample() {
	return <PlacementGrid placement='menu' />
}
