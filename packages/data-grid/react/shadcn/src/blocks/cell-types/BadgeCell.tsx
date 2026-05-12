'use client'

import { Badge } from '@grid-shadcn/components/ui/badge'

import { SelectCellInput } from './SelectCell'

import type { BadgeCellConfig, CellViewProps, FieldState } from '@ez-kit/data-grid-react'

function BadgeCellView({ value, config }: CellViewProps<BadgeCellConfig>) {
	const items = config?.items ?? []
	const match = items.find((item) => item.value === String(value ?? ''))

	if (!match) {
		return <Badge>{String(value ?? '')}</Badge>
	}

	return <Badge variant={match.variant ?? 'default'}>{match.label}</Badge>
}

// Badge edit/filter UX is identical to Select — same compound, same payload.
function BadgeCellInput(props: FieldState<BadgeCellConfig>) {
	return <SelectCellInput {...props} />
}

export { BadgeCellInput, BadgeCellView }
