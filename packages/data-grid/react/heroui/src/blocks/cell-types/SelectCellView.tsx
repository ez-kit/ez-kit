'use client'

import type { CellViewProps, SelectCellConfig } from '@ez-kit/data-grid-react'

export function SelectCellView({ value, config }: CellViewProps<SelectCellConfig>) {
	const items = config?.items ?? []
	const match = items.find((item) => item.value === String(value ?? ''))
	return <>{match ? match.label : String(value ?? '')}</>
}
