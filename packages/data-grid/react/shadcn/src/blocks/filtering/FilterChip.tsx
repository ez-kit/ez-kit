'use client'

import { X } from 'lucide-react'

import { Badge } from '@grid-shadcn/components/ui/badge'
import { cn } from '@grid-shadcn/lib/utils'

import type { FilterChipProps } from '@ez-kit/data-grid-react'

export function FilterChip({ label, value, onRemove, kind, isDraft }: FilterChipProps) {
	return (
		<Badge
			variant='secondary'
			data-slot='filter-chip'
			data-chip-kind={kind}
			{...(isDraft ? { 'data-draft-filter': '' } : {})}
			className={cn('gap-1.5 pr-1 pl-2 py-1 h-auto text-xs font-normal')}
		>
			<span className='font-medium text-muted-foreground'>{label}</span>
			<span className='text-foreground'>{value}</span>
			<button
				type='button'
				onClick={onRemove}
				aria-label={`Remove ${label} filter`}
				data-slot='filter-chip-remove'
				className='ml-0.5 rounded-sm opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3'
			>
				<X />
			</button>
		</Badge>
	)
}
