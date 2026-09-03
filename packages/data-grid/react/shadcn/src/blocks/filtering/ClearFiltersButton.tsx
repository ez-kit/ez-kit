'use client'

import { FilterX } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { ClearFiltersButtonProps } from '@ez-kit/data-grid-react'

export function ClearFiltersButton({ disabled, onClick, 'aria-label': ariaLabel }: ClearFiltersButtonProps) {
	return (
		<Button
			type='button'
			variant='ghost'
			size='icon'
			data-slot='clear-filters-button'
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={onClick}
			className='h-8'
		>
			<FilterX className='h-4 w-4' />
		</Button>
	)
}
