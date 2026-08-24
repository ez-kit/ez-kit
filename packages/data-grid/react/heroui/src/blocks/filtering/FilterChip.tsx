'use client'

import { Chip } from '@heroui/react'
import { X } from 'lucide-react'

import type { FilterChipProps } from '@ez-kit/data-grid-react'

/**
 * HeroUI chip used by `<DataGrid.ActiveFiltersBar />` to represent one active
 * filter. Renders the column label, current display value, and a small remove
 * button bound to `onRemove`.
 */
export function FilterChip({ label, value, onRemove, kind, isDraft }: FilterChipProps) {
	return (
		<Chip
			data-slot='filter-chip'
			data-chip-kind={kind}
			{...(isDraft ? { 'data-draft-filter': '' } : {})}
			variant='soft'
			size='sm'
		>
			<Chip.Label>
				<span className='inline-flex items-center gap-1.5'>
					<span className='font-medium opacity-75'>{label}</span>
					<span>{value}</span>
					<button
						type='button'
						onClick={onRemove}
						aria-label={`Remove ${label} filter`}
						data-slot='filter-chip-remove'
						className='inline-flex items-center justify-center ml-0.5 p-0 border-none bg-transparent cursor-pointer opacity-70'
					>
						<X size={12} />
					</button>
				</span>
			</Chip.Label>
		</Chip>
	)
}
