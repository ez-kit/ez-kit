'use client'

import { useGridComponents } from '@ez-kit/data-grid-react'

import type { CellInputProps } from '@ez-kit/data-grid-react'

export function ProgressCellInput({ value, onChange }: CellInputProps) {
	const { NumberInput } = useGridComponents()
	return (
		<NumberInput
			value={typeof value === 'number' ? value : undefined}
			onChange={onChange}
		/>
	)
}
