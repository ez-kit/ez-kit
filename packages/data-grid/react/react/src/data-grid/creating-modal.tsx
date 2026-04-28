import { useGridComponents } from '../components-context'

import { AutoForm } from './auto-form'
import { useTableContext } from './table-context'

/**
 * Modal for creating a new row (creating.mode = 'modal').
 * Throws at render time if no Modal component is provided.
 */
export function CreatingModal() {
	const table = useTableContext()
	const { Modal } = useGridComponents()
	const isOpen = table.getCreatingState().isCreating

	if (!isOpen) return null

	// Modal may be overridden to undefined/null via components prop at runtime
	const ModalComponent = Modal as typeof Modal | undefined
	if (!ModalComponent) {
		throw new Error(
			'[@ez-kit/data-grid] creating.mode is "modal" but no Modal component was provided. ' +
				'Pass a Modal component via <DataGrid components={{ Modal }}>.',
		)
	}

	return (
		<ModalComponent
			open={isOpen}
			onClose={() => {
				table.cancelCreating()
			}}
			title='Create'
		>
			<AutoForm mode='creating' />
			<button
				type='button'
				onClick={() => void table.commitCreating()}
			>
				Save
			</button>
			<button
				type='button'
				onClick={() => {
					table.cancelCreating()
				}}
			>
				Cancel
			</button>
		</ModalComponent>
	)
}
