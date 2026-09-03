'use client'

import { Button } from '@heroui/react'
import { FilterX } from 'lucide-react'

import type { ClearFiltersButtonProps } from '@ez-kit/data-grid-react'

export function ClearFiltersButton({ disabled, onClick, 'aria-label': ariaLabel }: ClearFiltersButtonProps) {
	return (
		<Button
			variant='ghost'
			size='sm'
			isIconOnly
			{...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
			isDisabled={disabled}
			onPress={onClick}
			data-slot='clear-filters-button'
		>
			<FilterX size={16} />
		</Button>
	)
}
