'use client'

import { Button } from '@heroui/react'
import { FilterX } from 'lucide-react'

import type { ClearFiltersButtonComponentProps } from '@ez-kit/data-grid-react'

export function ClearFiltersButton({ disabled, onPress, ariaLabel }: ClearFiltersButtonComponentProps) {
	return (
		<Button
			variant='ghost'
			size='sm'
			isIconOnly
			{...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
			isDisabled={disabled}
			onPress={onPress}
			data-slot='clear-filters-button'
		>
			<FilterX size={16} />
		</Button>
	)
}
