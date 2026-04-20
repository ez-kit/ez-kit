'use client'

import { Badge } from '@grid-shadcn/components/ui/badge'

import type { BadgeVariant, CellViewProps } from '@ez-kit/data-grid-react'

interface BadgeItemShape {
	value: string
	label: string
	variant?: BadgeVariant
}

export function BadgeCellView({ value, cellConfig }: CellViewProps) {
	const items = (cellConfig?.items as BadgeItemShape[] | undefined) ?? []
	const match = items.find((item) => item.value === String(value ?? ''))

	if (!match) {
		return <Badge>{String(value ?? '')}</Badge>
	}

	return <Badge variant={match.variant ?? 'default'}>{match.label}</Badge>
}
