import { ColumnFormMode } from '@ez-kit/data-grid-core'

import { FormModalHost } from './form-modal'
import { useDataGridState, useDataGridTable } from './table-context'

/**
 * Modal for editing a row (`editing.mode: 'modal'`), mounted by the grid itself.
 *
 * Renders nothing while no row is being edited. To replace the dialog — or the form inside it — register a
 * `FormModal` component; see `FormModalProps`.
 */
export function EditingModal() {
	const table = useDataGridTable()
	useDataGridState((s) => s.editing)
	const state = table.editing.getState()

	if (!state.rowId) return null

	return (
		<FormModalHost
			mode={ColumnFormMode.Editing}
			title={table.grid.messages.editing.title}
			state={state}
			rowId={state.rowId}
		/>
	)
}
