import type { ToolbarProps } from '@ez-kit/data-grid-react'

export function Toolbar({ children, left, right, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				role='toolbar'
				{...props}
			>
				{children}
			</div>
		)
	}

	return (
		<div
			role='toolbar'
			style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
			{...props}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{left}</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{right}</div>
		</div>
	)
}
