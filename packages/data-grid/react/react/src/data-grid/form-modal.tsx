import { ColumnFormMode, CommitStatus } from '@ez-kit/data-grid-core'
import { useCallback } from 'react'

import { useGridComponents } from '../components-context'

import { AutoForm, AutoFormField, editedRowOf, formFieldIds } from './auto-form'
import { useDataGridTable } from './table-context'

import type { CommitResult, ValidationErrors, ValidationResult } from '@ez-kit/data-grid-core'

/** The slice fields the host reads — common to `creating` and `editing`. */
type FormModalState = {
	initialValues: Record<string, unknown>
	errors: ValidationErrors
	formError: string | null
	commitStatus: CommitStatus
}

type FormModalHostProps = {
	mode: ColumnFormMode
	title: string
	state: FormModalState
	/** The row being edited — `null` when creating. */
	rowId: string | null
}

/**
 * The dialog shared by the creating and editing modals: the `FormModal` slot, handed the whole
 * form contract — see `FormModalProps`.
 *
 * The slot is the one way to replace the modal. A kit registers its dialog there, and an
 * application registers a form of its own the same way, per grid or app-wide. A kit that
 * registers none is caught at mount by `ComponentGuard` in development.
 */
export function FormModalHost({ mode, title, state, rowId }: FormModalHostProps) {
	const table = useDataGridTable()
	const { FormModal } = useGridComponents().editing
	const isCreating = mode === ColumnFormMode.Creating

	const submit = useCallback(
		(values?: Record<string, unknown>): Promise<CommitResult> => {
			const options = values === undefined ? undefined : { values }
			return isCreating ? table.creating.commit(options) : table.editing.commit(options)
		},
		[table, isCreating],
	)
	const onCancel = useCallback((): void => {
		if (isCreating) table.creating.cancel()
		else table.editing.cancel()
	}, [table, isCreating])
	const validate = useCallback(
		(values: Record<string, unknown>): Promise<ValidationResult> =>
			isCreating ? table.creating.validateValues(values) : table.editing.validateValues(values),
		[table, isCreating],
	)
	const onSave = useCallback(async (): Promise<void> => {
		await submit()
	}, [submit])

	// A partial kit can leave the slot out; `ComponentGuard` names it in development, and this is
	// the production half of the same message.
	const ModalComponent = FormModal as typeof FormModal | undefined
	if (!ModalComponent) {
		throw new Error(
			`[@ez-kit/data-grid] ${mode}.mode is "modal" but no FormModal component was provided. ` +
				'Register one via <DataGrid components={{ editing: { FormModal } }}>.',
		)
	}

	return (
		<ModalComponent
			open
			mode={mode}
			title={title}
			formError={state.formError}
			errors={state.errors}
			isPending={state.commitStatus !== CommitStatus.Idle}
			initialValues={state.initialValues}
			row={isCreating ? undefined : editedRowOf(table, rowId)}
			submit={submit}
			validate={validate}
			onSave={onSave}
			onCancel={onCancel}
			// Elements of components that resolve their own field, so a slot that renders none of them
			// pays for none of them.
			fields={Object.fromEntries(
				formFieldIds(table, mode).map((columnId) => [
					columnId,
					<AutoFormField
						key={columnId}
						mode={mode}
						columnId={columnId}
					/>,
				]),
			)}
		>
			<AutoForm mode={mode} />
		</ModalComponent>
	)
}
