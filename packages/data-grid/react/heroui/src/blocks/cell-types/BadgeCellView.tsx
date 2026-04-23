'use client'

import { Chip } from '@heroui/react'

import type { BadgeVariant, CellViewProps } from '@ez-kit/data-grid-react'

interface BadgeItemShape {
	value: string
	label: string
	variant?: BadgeVariant
}

function mapBadgeVariant(variant: BadgeVariant | undefined): 'primary' | 'secondary' | 'soft' | undefined {
	if (variant === 'outline') return 'soft'
	if (variant === 'secondary') return 'secondary'
	return 'primary'
}

export function BadgeCellView({ value, cellConfig }: CellViewProps) {
	const items = (cellConfig?.items as BadgeItemShape[] | undefined) ?? []
	const match = items.find((item) => item.value === String(value ?? ''))

	return (
		<Chip variant={mapBadgeVariant(match?.variant)}>
			<Chip.Label>{match ? match.label : String(value ?? '')}</Chip.Label>
		</Chip>
	)
}
