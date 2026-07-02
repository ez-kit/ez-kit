import { Input } from '@grid-shadcn/components/ui/input'

import type { NumberInputProps } from '@ez-kit/data-grid-react'

export function NumberInput({ value, onChange }: NumberInputProps) {
	return (
		<Input
			type='number'
			placeholder='0'
			value={typeof value === 'number' && !Number.isNaN(value) ? value : ''}
			onChange={(e) => {
				const n = e.target.valueAsNumber
				onChange?.(Number.isNaN(n) ? undefined : n)
			}}
		/>
	)
}
