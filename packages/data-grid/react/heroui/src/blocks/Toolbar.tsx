import type { ToolbarProps } from '@ez-kit/data-grid-react'

export function Toolbar({ children }: ToolbarProps) {
	return (
		<div
			role='toolbar'
			style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}
		>
			{children}
		</div>
	)
}
