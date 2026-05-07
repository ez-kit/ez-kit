import { useGridComponents } from '../components-context'

import { AutoForm } from './auto-form'
import { useTableContext } from './table-context'

/**
 * Modal for editing a row (editing.mode = 'modal').
 * Throws at render time if no Modal component is provided.
 */
export function EditingModal() {
	const table = useTableContext()
	const { Modal } = useGridComponents()
	const isOpen = Boolean(table.getEditingState().editingRowId)

	if (!isOpen) return null

	// Modal may be overridden to undefined/null via components prop at runtime
	const ModalComponent = Modal as typeof Modal | undefined
	if (!ModalComponent) {
		throw new Error(
			'[@ez-kit/data-grid] editing.mode is "modal" but no Modal component was provided. ' +
				'Pass a Modal component via <DataGrid components={{ Modal }}>.',
		)
	}

	return (
		<ModalComponent
			open={isOpen}
			onClose={() => {
				table.cancelEditing()
			}}
			onSave={() => void table.commitEditing()}
			onCancel={() => {
				table.cancelEditing()
			}}
			title='Edit'
		>
			<AutoForm mode='editing' />
		</ModalComponent>
	)
}
