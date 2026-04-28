import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

import type { Row } from '@tanstack/table-core'

interface ActionsCellProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

/**
 * Renders edit / delete / save / cancel buttons in the __actions__ column.
 * Behavior depends on the current editing state of the row.
 */
export function ActionsCell({ row }: ActionsCellProps) {
	const table = useTableContext()
	const { Button } = useGridComponents()
	const editingState = table.getEditingState()
	const isEditing = editingState.editingRowId === row.id
	const hasEditing = Boolean(table.options.editing)
	const hasDeleting = Boolean(table.options.deleting)

	if (isEditing) {
		return (
			<>
				<Button onClick={() => void table.commitEditing()}>Save</Button>
				<Button
					onClick={() => {
						table.cancelEditing()
					}}
				>
					Cancel
				</Button>
			</>
		)
	}

	return (
		<>
			{hasEditing && (
				<Button
					onClick={() => {
						table.startEditing(row.id)
					}}
				>
					Edit
				</Button>
			)}
			{hasDeleting && (
				<Button
					onClick={() => {
						table.requestDeleteRow(row.id)
					}}
				>
					Delete
				</Button>
			)}
		</>
	)
}
