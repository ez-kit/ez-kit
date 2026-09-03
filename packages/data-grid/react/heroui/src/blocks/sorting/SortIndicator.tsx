'use client'

import { ColumnSortDirection } from '@ez-kit/data-grid-react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import type { SortIndicatorProps } from '@ez-kit/data-grid-react'

export function SortIndicator({ sortDirection, canSort }: SortIndicatorProps) {
	if (!canSort) return null
	if (sortDirection === ColumnSortDirection.Asc)
		return (
			<ArrowUp
				size={12}
				className='ml-1'
				aria-hidden
			/>
		)
	if (sortDirection === ColumnSortDirection.Desc)
		return (
			<ArrowDown
				size={12}
				className='ml-1'
				aria-hidden
			/>
		)
	return (
		<ArrowUpDown
			size={12}
			className='ml-1 opacity-40'
			aria-hidden
		/>
	)
}
