'use client'

import { Button } from '@heroui/react'
import { FilterX } from 'lucide-react'

import type { ClearFiltersButtonProps } from '@ez-kit/data-grid-react'

export function ClearFiltersButton({ disabled, onClick, children, 'aria-label': ariaLabel }: ClearFiltersButtonProps) {
	// Icon-only is the default; own children make it a labelled button, so it stops being a square.
	const isIconOnly = children === undefined
	return (
		<Button
			variant='ghost'
			size='sm'
			{...(isIconOnly ? { isIconOnly: true } : {})}
			{...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
			isDisabled={disabled}
			onPress={onClick}
			data-slot='clear-filters-button'
		>
			{children ?? <FilterX size={16} />}
		</Button>
	)
}
