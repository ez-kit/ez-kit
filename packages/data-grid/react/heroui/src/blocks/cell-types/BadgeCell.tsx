'use client'

import { Chip } from '@heroui/react'

import { SelectCellInput } from './SelectCell'

import type { BadgeCellConfig, BadgeVariant, CellViewProps, FieldState } from '@ez-kit/data-grid-react'

function mapBadgeVariant(variant: BadgeVariant | undefined): 'primary' | 'secondary' | 'soft' | undefined {
	if (variant === 'outline') return 'soft'
	if (variant === 'secondary') return 'secondary'
	return 'primary'
}

function BadgeCellView({ value, config }: CellViewProps<BadgeCellConfig>) {
	const items = config?.items ?? []
	const match = items.find((item) => item.value === String(value ?? ''))
	return (
		<Chip variant={mapBadgeVariant(match?.variant)}>
			<Chip.Label>{match ? match.label : String(value ?? '')}</Chip.Label>
		</Chip>
	)
}

// Badge edit/filter UX is identical to Select — same compound, same payload.
function BadgeCellInput(props: FieldState<BadgeCellConfig>) {
	return <SelectCellInput {...props} />
}

export { BadgeCellInput, BadgeCellView }
