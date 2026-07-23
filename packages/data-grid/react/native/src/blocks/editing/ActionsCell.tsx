import type { ActionsCellProps } from '@ez-kit/data-grid-react'

export function ActionsCell({
	isEditing,
	hasEditing,
	hasDeleting,
	onEdit,
	onDelete,
	onSave,
	onCancel,
	isPending,
}: ActionsCellProps) {
	if (isEditing) {
		return (
			<>
				<button
					type='button'
					onClick={() => void onSave()}
					disabled={isPending}
				>
					{isPending ? 'Saving…' : 'Save'}
				</button>
				<button
					type='button'
					onClick={onCancel}
				>
					Cancel
				</button>
			</>
		)
	}
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
