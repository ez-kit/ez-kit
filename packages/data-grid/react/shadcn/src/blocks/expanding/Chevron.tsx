'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { ChevronProps } from '@ez-kit/data-grid-react'

export function Chevron({ expanded, onClick }: ChevronProps) {
	const messages = useGridMessages()
	const Icon = expanded ? ChevronDown : ChevronRight

	return (
		<Button
			variant='ghost'
			size='icon'
			type='button'
			onClick={onClick}
			aria-label={expanded ? messages.expanding.collapse : messages.expanding.expand}
		>
			<Icon className='size-4' />
		</Button>
	)
}
