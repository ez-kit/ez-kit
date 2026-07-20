import type { CreatingActionsCellProps } from '@ez-kit/data-grid-react'

export function CreatingActionsCell({ onSave, onCancel, isPending }: CreatingActionsCellProps) {
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
