import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			data-variant={variant}
			style={{ display: 'flex', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}
		>
			<span>{count} selected</span>
			{onDelete && (
				<button
					type='button'
					onClick={onDelete}
				>
					Delete
				</button>
			)}
			{actions}
			<button
				type='button'
				onClick={onClear}
			>
				Cancel
			</button>
		</div>
	)
}
