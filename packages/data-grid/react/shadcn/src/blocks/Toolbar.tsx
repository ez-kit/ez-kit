import type { ToolbarProps } from '@ez-kit/data-grid-react'

export function Toolbar({ children, ...props }: ToolbarProps) {
	return (
		<div
			{...props}
			className='flex items-center justify-end'
		>
			{children}
		</div>
	)
}
