import { cn } from '@heroui/react'

import type { ToolbarProps } from '@ez-kit/data-grid-react'

/**
 * `className` is the caller's, merged with the bar's own rather than concatenated, so a utility that
 * collides with one of the kit's replaces it — `mb-2` is right for a toolbar standing free above the
 * table and wrong for one used as the header bar of a framed grid.
 *
 * `...props` carries the react layer's `data-slot='toolbar'` through. It is spread rather
 * than dropped for the same reason `Tr` stopped consuming `data-row-id`: the attribute is the
 * layer's contract with the kits' CSS and with the browser specs, and a kit that swallows one
 * diverges silently — nothing here renders differently, the name for the region simply stops
 * existing in this kit.
 */
export function Toolbar({ children, start, end, className, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				{...props}
				role='toolbar'
				className={cn('flex items-center gap-2 mb-2', className)}
			>
				{children}
			</div>
		)
	}

	return (
		<div
			{...props}
			role='toolbar'
			className={cn('flex items-center justify-between gap-2 mb-2', className)}
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
