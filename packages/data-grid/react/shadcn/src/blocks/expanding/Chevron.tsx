'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '../../components/ui/button'

import type { ChevronProps } from '@ez-kit/data-grid-react'

export function Chevron({ expanded, onClick, disabled }: ChevronProps) {
	const Icon = expanded ? ChevronDown : ChevronRight

	return (
		<Button
			variant='ghost'
			size='icon'
			type='button'
			disabled={disabled}
			onClick={onClick}
			aria-label={expanded ? 'Collapse row' : 'Expand row'}
		>
			<Icon className='size-4' />
		</Button>
	)
}
