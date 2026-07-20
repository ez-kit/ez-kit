import type { FormShellProps } from '@ez-kit/data-grid-react'

export function FormShell({ open, title, formError, isPending, onSave, onCancel, children }: FormShellProps) {
	if (!open) return null
	return (
		<dialog open>
			<header>{title}</header>
			{formError ? (
				<p
					role='alert'
					style={{ color: 'crimson' }}
				>
					{formError}
				</p>
			) : null}
			{children}
			<footer>
				<button
					type='button'
					onClick={onCancel}
				>
					Cancel
				</button>
				<button
					type='button'
					onClick={() => void onSave()}
					disabled={isPending}
				>
					{isPending ? 'Saving…' : 'Save'}
				</button>
			</footer>
		</dialog>
	)
}
