'use client'

import { Link } from '@heroui/react'

import type { CellViewProps } from '@ez-kit/data-grid-react'

export function LinkCellView({ value }: CellViewProps) {
	const href = String(value ?? '')

	if (!href) return null

	return (
		<Link
			href={href}
			target='_blank'
			rel='noreferrer'
		>
			{href}
		</Link>
	)
}
