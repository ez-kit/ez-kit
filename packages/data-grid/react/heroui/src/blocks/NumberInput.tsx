'use client'

import { NumberField } from '@heroui/react'

import type { NumberInputProps } from '@ez-kit/data-grid-react'

export function NumberInput({ value, onChange }: NumberInputProps) {
	const valueProps = value === undefined ? {} : { value }

	return (
		<NumberField
			{...valueProps}
			onChange={(next) => {
				onChange?.(Number.isNaN(next) ? undefined : next)
			}}
		>
			<NumberField.Group>
				<NumberField.Input />
			</NumberField.Group>
		</NumberField>
	)
}
