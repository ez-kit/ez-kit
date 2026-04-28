'use client'

import { Input } from '@heroui/react'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'

export function BetweenInput({ value, onChange, type, min, max }: BetweenInputProps) {
	const inputType = type === 'number' ? 'number' : 'date'

	return (
		<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
			<Input
				type={inputType}
				placeholder='From'
				value={(value.from as string | number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next =
						inputType === 'number'
							? Number.isNaN(e.target.valueAsNumber)
								? undefined
								: e.target.valueAsNumber
							: e.target.value || undefined
					onChange({ ...value, from: next })
				}}
			/>
			<span aria-hidden>–</span>
			<Input
				type={inputType}
				placeholder='To'
				value={(value.to as string | number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next =
						inputType === 'number'
							? Number.isNaN(e.target.valueAsNumber)
								? undefined
								: e.target.valueAsNumber
							: e.target.value || undefined
					onChange({ ...value, to: next })
				}}
			/>
		</div>
	)
}
