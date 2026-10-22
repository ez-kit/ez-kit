import { ColumnFormMode } from '@ez-kit/data-grid-core'

import { FormModalHost } from './form-modal'
import { useDataGridState, useDataGridTable } from './table-context'

/**
 * Modal for creating a new row (`creating.mode: 'modal'`), mounted by the grid itself.
 *
 * Renders nothing while the create form is closed. To replace the dialog — or the form inside it — register a
 * `FormModal` component; see `FormModalProps`.
 */
export function CreatingModal() {
	const table = useDataGridTable()
	useDataGridState((s) => s.creating)
	const state = table.creating.getState()

	if (!state.isOpen) return null

	return (
		<FormModalHost
			mode={ColumnFormMode.Creating}
			title={table.grid.messages.creating.title}
			state={state}
			rowId={null}
		/>
	)
}
