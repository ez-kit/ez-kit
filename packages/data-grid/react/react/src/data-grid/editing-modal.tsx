import { AutoFormMode } from './auto-form'
import { FormModalHost } from './form-modal'
import { useDataGridState, useDataGridTable } from './table-context'

import type { DataGridFormModalProps } from './form-modal'

export type DataGridEditingModalProps = DataGridFormModalProps

/**
 * Modal for editing a row (`editing.mode: 'modal'`).
 *
 * Renders nothing while no row is being edited. See {@link DataGridFormModalProps} for
 * replacing the dialog while keeping the generated fields.
 */
export function EditingModal({ children }: DataGridEditingModalProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.editing)
	const state = table.editing.getState()

	if (!state.rowId) return null

	return (
		<FormModalHost
			{...(children !== undefined ? { children } : {})}
			mode={AutoFormMode.Editing}
			feature='editing'
			title='Edit'
			formError={state.formError}
			commitStatus={state.commitStatus}
			onSave={() => table.editing.commit()}
			onCancel={() => {
				table.editing.cancel()
			}}
		/>
	)
}
