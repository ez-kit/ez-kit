'use client'

import type { CellViewProps } from '@ez-kit/data-grid-react'

export function SelectCellView({ value, cellConfig }: CellViewProps) {
	const items = (cellConfig?.items as { value: string; label: string }[] | undefined) ?? []
	const match = items.find((item) => item.value === String(value ?? ''))
	return <>{match ? match.label : String(value ?? '')}</>
}
