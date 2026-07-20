'use client'

import { Button } from '@heroui/react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import type { ChevronProps } from '@ez-kit/data-grid-react'

export function Chevron({ expanded, onClick, disabled }: ChevronProps) {
	const Icon = expanded ? ChevronDown : ChevronRight

	return (
		<Button
			variant='ghost'
			size='sm'
			isIconOnly
			{...(disabled !== undefined ? { isDisabled: disabled } : {})}
			onPress={() => {
				onClick()
			}}
			aria-label={expanded ? 'Collapse row' : 'Expand row'}
		>
			<Icon className='size-4' />
		</Button>
	)
}
