import { CommitStatus } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'

import { AutoForm } from './auto-form'

import type { ColumnFormMode } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/**
 * What a `<DataGrid.CreatingModal>` / `<DataGrid.EditingModal>` render function receives.
 *
 * One shape for both: the two modals differ only in which feature they read, and a consumer
 * that styles one almost always styles the other the same way.
 */
export type DataGridFormModalRenderArgs = {
	/** Always `true` — the render function is not called while the form is closed. */
	open: boolean
	/** The kit's default dialog title (`'Create'` / `'Edit'`). */
	title: string
	/** Form-level error from the last failed commit, or `null`. */
	formError: string | null
	/** True while a commit is validating or in flight — disable Save. */
	isPending: boolean
	/**
	 * The generated field set, already wired to the feature's state. Render it to keep the
	 * inputs the columns describe while replacing everything around them.
	 */
	form: ReactNode
	/** Validates and commits. Rejects nothing — read `formError` for the failure. */
	onSave: () => Promise<void>
	onCancel: () => void
}

export type DataGridFormModalProps = {
	/**
	 * Custom dialog, replacing the kit's `FormShell` / `Modal`.
	 *
	 * Nothing is rendered — `children` included — while the form is closed.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.EditingModal>
	 *   {({ form, isPending, onSave, onCancel }) => (
	 *     <MyDialog onClose={onCancel}>
	 *       {form}
	 *       <button disabled={isPending} onClick={() => void onSave()}>Save</button>
	 *     </MyDialog>
	 *   )}
	 * </DataGrid.EditingModal>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridFormModalRenderArgs) => ReactNode)
}

type FormModalHostProps = DataGridFormModalProps & {
	mode: ColumnFormMode
	title: string
	formError: string | null
	commitStatus: CommitStatus
	onSave: () => Promise<void>
	onCancel: () => void
	/** Names the feature in the "no component registered" error. */
	feature: 'creating' | 'editing'
}

/**
 * The dialog shell shared by the creating and editing modals.
 *
 * Prefers `<FormShell>` (which renders the form-level error banner and the pending Save)
 * when the kit registers one; falls back to the generic `<Modal>`. Throws when neither is
 * available and no `children` took over.
 */
export function FormModalHost({
	children,
	mode,
	title,
	formError,
	commitStatus,
	onSave,
	onCancel,
	feature,
}: FormModalHostProps) {
	const { Modal, FormShell } = useGridComponents().editing
	const isPending = commitStatus !== CommitStatus.Idle
	const form = <AutoForm mode={mode} />

	if (children !== undefined) {
		return typeof children === 'function'
			? children({ open: true, title, formError, isPending, form, onSave, onCancel })
			: children
	}

	// FormShell may be overridden to undefined/null via components prop at runtime
	const ShellComponent = FormShell as typeof FormShell | undefined
	if (ShellComponent) {
		return (
			<ShellComponent
				open
				title={title}
				formError={formError}
				isPending={isPending}
				onSave={onSave}
				onCancel={onCancel}
			>
				{form}
			</ShellComponent>
		)
	}

	const ModalComponent = Modal as typeof Modal | undefined
	if (!ModalComponent) {
		throw new Error(
			`[@ez-kit/data-grid] ${feature}.mode is "modal" but no Modal or FormShell component was provided. ` +
				'Pass a FormShell (preferred) or Modal via <DataGrid components={{ FormShell }}>.',
		)
	}

	return (
		<ModalComponent
			open
			onClose={onCancel}
			onSave={() => void onSave()}
			onCancel={onCancel}
			title={title}
		>
			{form}
		</ModalComponent>
	)
}
