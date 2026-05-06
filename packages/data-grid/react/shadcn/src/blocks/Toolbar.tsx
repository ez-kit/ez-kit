import type { ToolbarProps } from '@ez-kit/data-grid-react'

export function Toolbar({ children, left, right, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				{...props}
				className='flex items-center gap-2'
			>
				{children}
			</div>
		)
	}

	return (
		<div
			{...props}
			className='flex items-center justify-between gap-2'
		>
			<div className='flex items-center gap-2'>{left}</div>
			<div className='flex items-center gap-2'>{right}</div>
		</div>
	)
}
