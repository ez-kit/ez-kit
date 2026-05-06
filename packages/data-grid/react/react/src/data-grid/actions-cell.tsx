import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

import type { Row } from '@tanstack/table-core'

type ActionsCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

export function ActionsCell({ row }: ActionsCellProps) {
	const table = useTableContext()
	const { ActionsCell: Renderer } = useGridComponents()

	if (!Renderer) return null

	const editingState = table.getEditingState()

	return (
		<Renderer
			row={row}
			isEditing={editingState.editingRowId === row.id}
			hasEditing={Boolean(table.options.editing)}
			hasDeleting={Boolean(table.options.deleting)}
			onEdit={() => {
				table.startEditing(row.id)
			}}
			onDelete={() => {
				table.requestDeleteRow(row.id)
			}}
			onSave={() => table.commitEditing()}
			onCancel={() => {
				table.cancelEditing()
			}}
		/>
	)
}
