'use client'

import { Button } from '@heroui/react'
import { FilterX } from 'lucide-react'

import type { ClearFilterButtonProps } from '@ez-kit/data-grid-react'

export function ClearFilterButton({ disabled, onClick, children, 'aria-label': ariaLabel }: ClearFilterButtonProps) {
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
			data-slot='clear-filter-button'
		>
			{children ?? <FilterX size={16} />}
		</Button>
	)
}
