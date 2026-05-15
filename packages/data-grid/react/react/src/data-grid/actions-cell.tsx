import { useGridComponents } from '../components-context'

import { useDataGridInstance, useDataGridStore } from './table-context'

import type { Row } from '@tanstack/table-core'

type ActionsCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

/**
 * Renders per-row action buttons (edit / delete / save / cancel) for the
 * actions system column.
 *
 * Subscribes only via two boolean selectors that are stably `false` for
 * non-target rows — so editing mutations on a different row do NOT re-render
 * this `ActionsCell`. For the targeted row, the booleans flip exactly when
 * the row enters / leaves edit mode and when the commit status leaves `idle`.
 */
export function ActionsCell({ row }: ActionsCellProps) {
	const instance = useDataGridInstance()
	const table = instance.table
	const { ActionsCell: Renderer } = useGridComponents()

	// Stable booleans — non-target rows stay `false` across any editing change.
	const isEditing = useDataGridStore((s) => s.editing.rowId === row.id)
	const isPending = useDataGridStore(
		(s) => s.editing.rowId === row.id && s.editing.commitStatus !== 'idle',
	)

	return (
		<Renderer
			row={row}
			isEditing={isEditing}
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
