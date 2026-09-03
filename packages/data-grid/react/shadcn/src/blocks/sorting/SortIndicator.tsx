import { ColumnSortDirection } from '@ez-kit/data-grid-react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { SortIndicatorProps } from '@ez-kit/data-grid-react'

export function SortIndicator({ sortDirection, canSort }: SortIndicatorProps) {
	if (!canSort) return null
	const icon =
		sortDirection === ColumnSortDirection.Asc ? (
			<ArrowUp
				className='h-3 w-3'
				aria-hidden
			/>
		) : sortDirection === ColumnSortDirection.Desc ? (
			<ArrowDown
				className='h-3 w-3'
				aria-hidden
			/>
		) : (
			<ArrowUpDown
				className='h-3 w-3 opacity-40'
				aria-hidden
			/>
		)
	return (
		<Button
			variant='ghost'
			size='icon'
			className='ml-1 h-5 w-5 shrink-0'
			tabIndex={-1}
		>
			{icon}
		</Button>
	)
}
