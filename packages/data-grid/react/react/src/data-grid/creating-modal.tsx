import { useGridComponents } from '../components-context'

import { AutoForm } from './auto-form'
import { useTable } from './table-context'

/**
 * Modal for creating a new row (creating.mode = 'modal').
 * Prefers <FormShell> (renders form-level error banner + pending Save) when
 * registered; falls back to generic <Modal>. Throws if neither is provided.
 */
export function CreatingModal() {
	const table = useTable()
	const { Modal, FormShell } = useGridComponents()
	const state = table.creating.getState()
	const isOpen = state.isOpen

	if (!isOpen) return null

	const onSave = (): Promise<void> => table.creating.commit()
	const onCancel = (): void => {
		table.creating.cancel()
	}

	// FormShell may be overridden to undefined/null via components prop at runtime
	const ShellComponent = FormShell as typeof FormShell | undefined
	if (ShellComponent) {
		return (
			<ShellComponent
				open={isOpen}
				title='Create'
				formError={state.formError}
				isPending={state.commitStatus !== 'idle'}
				onSave={onSave}
				onCancel={onCancel}
			>
				<AutoForm mode='creating' />
			</ShellComponent>
		)
	}

	const ModalComponent = Modal as typeof Modal | undefined
	if (!ModalComponent) {
		throw new Error(
			'[@ez-kit/data-grid] creating.mode is "modal" but no Modal or FormShell component was provided. ' +
				'Pass a FormShell (preferred) or Modal via <DataGrid components={{ FormShell }}>.',
		)
	}

	return (
		<ModalComponent
			open={isOpen}
			onClose={onCancel}
			onSave={() => void onSave()}
			onCancel={onCancel}
			title='Create'
		>
			<AutoForm mode='creating' />
		</ModalComponent>
	)
}
