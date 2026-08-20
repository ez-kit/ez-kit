import { RowActionsMode } from '@ez-kit/data-grid-react'

import type { ActionsCellProps } from '@ez-kit/data-grid-react'

function SaveCancel({
	onSave,
	onCancel,
	isPending,
	canCancel,
}: {
	onSave: () => Promise<void>
	onCancel: () => void
	isPending: boolean
	canCancel: boolean
}) {
	return (
		<>
			<button
				type='button'
				onClick={() => void onSave()}
				disabled={isPending}
			>
				{isPending ? 'Saving…' : 'Save'}
			</button>
			{canCancel && (
				<button
					type='button'
					onClick={onCancel}
				>
					Cancel
				</button>
			)}
		</>
	)
}

export function ActionsCell(props: ActionsCellProps) {
	if (props.mode === RowActionsMode.Editing) {
		return (
			<SaveCancel
				onSave={props.onSave}
				onCancel={props.onCancel}
				isPending={props.isPending}
				canCancel
			/>
		)
	}

	if (props.mode === RowActionsMode.Creating) {
		return (
			<SaveCancel
				onSave={props.onSave}
				onCancel={props.onCancel}
				isPending={props.isPending}
				canCancel={props.canCancel}
			/>
		)
	}

	const { hasEditing, hasDeleting, onEdit, onDelete } = props

	return (
		<>
			{hasEditing && (
				<button
					type='button'
					onClick={onEdit}
				>
					Edit
				</button>
			)}
			{hasDeleting && (
				<button
					type='button'
					onClick={onDelete}
				>
					Delete
				</button>
			)}
		</>
	)
}
