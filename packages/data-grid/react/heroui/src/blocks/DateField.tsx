'use client'

import { Input } from '@heroui/react'

import type { DateFieldProps } from '@ez-kit/data-grid-react'

export function DateField({ value, onChange }: DateFieldProps) {
	return (
		<Input
			type='date'
			value={value ?? ''}
			onChange={(e) => {
				onChange?.(e.target.value)
			}}
		/>
	)
}
