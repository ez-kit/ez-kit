'use client'

import { Input } from '@heroui/react'

import type { CellInputProps } from '@ez-kit/data-grid-react'

export function ImageCellInput({ value, onChange }: CellInputProps) {
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
