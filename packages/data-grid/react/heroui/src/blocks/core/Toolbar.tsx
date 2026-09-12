import type { ToolbarProps } from '@ez-kit/data-grid-react'

/**
 * `...props` carries the react layer's `data-slot='toolbar'` through. It is spread rather
 * than dropped for the same reason `Tr` stopped consuming `data-row-id`: the attribute is the
 * layer's contract with the kits' CSS and with the browser specs, and a kit that swallows one
 * diverges silently — nothing here renders differently, the name for the region simply stops
 * existing in this kit.
 */
export function Toolbar({ children, start, end, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				{...props}
				role='toolbar'
				className='flex items-center gap-2 mb-2'
			>
				{children}
			</div>
		)
	}

	return (
		<div
			{...props}
			role='toolbar'
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
