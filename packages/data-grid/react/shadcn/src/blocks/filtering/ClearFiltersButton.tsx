'use client'

import { FilterX } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { ClearFiltersButtonProps } from '@ez-kit/data-grid-react'

export function ClearFiltersButton({ disabled, onClick, children, 'aria-label': ariaLabel }: ClearFiltersButtonProps) {
	// Icon-only is the default; own children make it a labelled button, so it stops being a square.
	const isIconOnly = children === undefined
	return (
		<Button
			type='button'
			variant='ghost'
			size={isIconOnly ? 'icon' : 'sm'}
			data-slot='clear-filters-button'
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={onClick}
			className='h-8'
		>
			{children ?? <FilterX className='h-4 w-4' />}
		</Button>
	)
}
