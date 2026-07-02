import type { ConfirmDialogProps } from '@ez-kit/data-grid-react'

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	if (!open) return null
	return (
		<dialog open>
			<p>
				<strong>{title}</strong>
			</p>
			<p>{description}</p>
			<button
				type='button'
				onClick={onConfirm}
			>
				Confirm
			</button>
			<button
				type='button'
				onClick={onCancel}
			>
				Cancel
			</button>
		</dialog>
	)
}
