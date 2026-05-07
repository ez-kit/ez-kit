import type { ToolbarProps } from '@ez-kit/data-grid-react'

export function Toolbar({ children, left, right }: ToolbarProps) {
	if (children) {
		return (
			<div
				role='toolbar'
				className='flex items-center gap-2 mb-2'
			>
				{children}
			</div>
		)
	}

	return (
		<div
			role='toolbar'
			className='flex items-center justify-between gap-2 mb-2'
		>
			<div className='flex items-center gap-2'>{left}</div>
			<div className='flex items-center gap-2'>{right}</div>
		</div>
	)
}
