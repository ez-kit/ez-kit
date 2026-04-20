'use client'

import { Button } from '@grid-shadcn/components/ui/button'

import type { CellViewProps } from '@ez-kit/data-grid-react'

export function LinkCellView({ value }: CellViewProps) {
	const href = String(value ?? '')

	if (!href) return null

	return (
		<Button
			variant='link'
			asChild
		>
			<a
				href={href}
				target='_blank'
				rel='noreferrer'
			>
				{href}
			</a>
		</Button>
	)
}
