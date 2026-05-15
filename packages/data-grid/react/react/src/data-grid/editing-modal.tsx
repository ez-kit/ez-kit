import { useGridComponents } from '../components-context'

import { AutoForm } from './auto-form'
import { useTable } from './table-context'

/**
 * Modal for editing a row (editing.mode = 'modal').
 * Prefers <FormShell> (renders form-level error banner + pending Save) when
 * registered; falls back to generic <Modal>. Throws if neither is provided.
 */
export function EditingModal() {
	const table = useTable()
	const { Modal, FormShell } = useGridComponents()
	const state = table.editing.getState()
	const isOpen = Boolean(state.rowId)

	if (!isOpen) return null

	const onSave = (): Promise<void> => table.editing.commit()
	const onCancel = (): void => {
		table.editing.cancel()
	}

	// FormShell may be overridden to undefined/null via components prop at runtime
	const ShellComponent = FormShell as typeof FormShell | undefined
	if (ShellComponent) {
		return (
			<ShellComponent
				open={isOpen}
				title='Edit'
				formError={state.formError}
				isPending={state.commitStatus !== 'idle'}
				onSave={onSave}
				onCancel={onCancel}
			>
				<AutoForm mode='editing' />
			</ShellComponent>
		)
	}

	const ModalComponent = Modal as typeof Modal | undefined
	if (!ModalComponent) {
		throw new Error(
			'[@ez-kit/data-grid] editing.mode is "modal" but no Modal or FormShell component was provided. ' +
				'Pass a FormShell (preferred) or Modal via <DataGrid components={{ FormShell }}>.',
		)
	}

	return (
		<ModalComponent
			open={isOpen}
			onClose={onCancel}
			onSave={() => void onSave()}
			onCancel={onCancel}
			title='Edit'
		>
			<AutoForm mode='editing' />
		</ModalComponent>
	)
}
