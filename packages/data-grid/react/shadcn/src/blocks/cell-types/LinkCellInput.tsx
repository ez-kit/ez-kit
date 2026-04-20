'use client'

import { Input } from '@grid-shadcn/components/ui/input'

import type { CellInputProps } from '@ez-kit/data-grid-react'

export function LinkCellInput({ value, onChange }: CellInputProps) {
	return (
		<Input
			type='url'
			value={String(value ?? '')}
			onChange={(e) => {
				onChange(e.target.value)
			}}
		/>
	)
}
