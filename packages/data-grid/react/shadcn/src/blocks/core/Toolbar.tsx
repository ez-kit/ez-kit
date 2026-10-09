import { cn } from '@grid-shadcn/lib/utils'

import type { ToolbarProps } from '@ez-kit/data-grid-react'

/**
 * `mb-2` is the gap a toolbar standing free above the table needs. It is merged rather than
 * concatenated so a caller's `mb-0` replaces it — a toolbar used as the header bar of a framed
 * grid sits flush against the table, and `cn` (tailwind-merge) is what lets the caller say so.
 *
 * The leading side wraps and the trailing one does not: a search box beside a filter panel
 * outgrows the row long before the trailing buttons do, and wrapping the side that grew keeps
 * those buttons pinned to the end of the first line.
 */
export function Toolbar({ children, start, end, className, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				{...props}
				className={cn('flex items-center gap-2 mb-2', className)}
			>
				{children}
			</div>
		)
	}

	return (
		<div
			{...props}
			className={cn('flex items-center justify-between gap-2 mb-2', className)}
		>
			<div
				data-slot='toolbar-start'
				className='flex min-w-0 flex-1 flex-wrap items-center gap-2'
			>
				{start}
			</div>
			<div
				data-slot='toolbar-end'
				className='flex shrink-0 items-center gap-2'
			>
				{end}
			</div>
		</div>
	)
}
