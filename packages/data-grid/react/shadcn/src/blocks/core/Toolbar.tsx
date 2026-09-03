import type { ToolbarProps } from '@ez-kit/data-grid-react'

export function Toolbar({ children, start, end, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				{...props}
				className='flex items-center gap-2 mb-2'
			>
				{children}
			</div>
		)
	}

	return (
		<div
			{...props}
			className='flex items-center justify-between gap-2 mb-2'
		>
			<div
				data-slot='toolbar-start'
				className='flex items-center gap-2'
			>
				{start}
			</div>
			<div
				data-slot='toolbar-end'
				className='flex items-center gap-2'
			>
				{end}
			</div>
		</div>
	)
}
