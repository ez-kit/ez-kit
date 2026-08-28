import { AutoFormMode } from './auto-form'
import { FormModalHost } from './form-modal'
import { useDataGridState, useDataGridTable } from './table-context'

import type { DataGridFormModalProps } from './form-modal'

export type DataGridCreatingModalProps = DataGridFormModalProps

/**
 * Modal for creating a new row (`creating.mode: 'modal'`).
 *
 * Renders nothing while the create form is closed. See {@link DataGridFormModalProps} for
 * replacing the dialog while keeping the generated fields.
 */
export function CreatingModal({ children }: DataGridCreatingModalProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.creating)
	const state = table.creating.getState()

	if (!state.isOpen) return null

	return (
		<FormModalHost
			{...(children !== undefined ? { children } : {})}
			mode={AutoFormMode.Creating}
			feature='creating'
			title='Create'
			formError={state.formError}
			commitStatus={state.commitStatus}
			onSave={() => table.creating.commit()}
			onCancel={() => {
				table.creating.cancel()
			}}
		/>
	)
}
