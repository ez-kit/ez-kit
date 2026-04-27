'use client'

import { Badge } from '@grid-shadcn/components/ui/badge'

import type { BadgeCellConfig, CellViewProps } from '@ez-kit/data-grid-react'

export function BadgeCellView({ value, config }: CellViewProps<BadgeCellConfig>) {
	const items = config?.items ?? []
	const match = items.find((item) => item.value === String(value ?? ''))

	if (!match) {
		return <Badge>{String(value ?? '')}</Badge>
	}

	return <Badge variant={match.variant ?? 'default'}>{match.label}</Badge>
}
