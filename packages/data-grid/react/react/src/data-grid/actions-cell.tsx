import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

import type { Row } from '@tanstack/table-core'

type ActionsCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

export function ActionsCell({ row }: ActionsCellProps) {
	const table = useTable()
	const { ActionsCell: Renderer } = useGridComponents()

	const editingState = table.editing.getState()
	const isPending = editingState.commitStatus !== 'idle'

	return (
		<Renderer
			row={row}
			isEditing={editingState.rowId === row.id}
			hasEditing={Boolean(table.options.editing)}
			hasDeleting={Boolean(table.options.deleting)}
			editingMode={table.options.editing?.mode}
			onEdit={() => {
				table.editing.start(row.id)
			}}
			onDelete={() => {
				table.requestDeleteRow(row.id)
			}}
			onSave={() => table.editing.commit()}
			onCancel={() => {
				table.editing.cancel()
			}}
			isPending={isPending}
		/>
	)
}
