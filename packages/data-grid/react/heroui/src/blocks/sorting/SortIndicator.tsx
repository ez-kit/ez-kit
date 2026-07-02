'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import type { SortIndicatorProps } from '@ez-kit/data-grid-react'

export function SortIndicator({ sortDir, canSort }: SortIndicatorProps) {
	if (!canSort) return null
	if (sortDir === 'asc') return <ArrowUp size={12} className='ml-1' aria-hidden />
	if (sortDir === 'desc') return <ArrowDown size={12} className='ml-1' aria-hidden />
	return <ArrowUpDown size={12} className='ml-1 opacity-40' aria-hidden />
}
