import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import type { SortIndicatorProps } from '@ez-kit/data-grid-react'

export function SortIndicator({ sortDir, canSort }: SortIndicatorProps) {
	if (!canSort) return null
	if (sortDir === 'asc') return <ArrowUp className='ml-1 h-3 w-3' aria-hidden />
	if (sortDir === 'desc') return <ArrowDown className='ml-1 h-3 w-3' aria-hidden />
	return <ArrowUpDown className='ml-1 h-3 w-3 opacity-40' aria-hidden />
}
