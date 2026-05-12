'use client'

import { Input } from '@heroui/react'

import { DateCellInput } from './cell-types/DateCell'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'

export function BetweenInput({ value, onChange, type, min, max }: BetweenInputProps) {
	if (type === 'date') {
		return (
			<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
				<DateCellInput
					id='between-from'
					value={value.from}
					onChange={(v) => {
						onChange({ ...value, from: v })
					}}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
				<span aria-hidden>–</span>
				<DateCellInput
					id='between-to'
					value={value.to}
					onChange={(v) => {
						onChange({ ...value, to: v })
					}}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
			</div>
		)
	}

	return (
		<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
			<Input
				type='number'
				placeholder='From'
				value={(value.from as number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, from: next })
				}}
			/>
			<span aria-hidden>–</span>
			<Input
				type='number'
				placeholder='To'
				value={(value.to as number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, to: next })
				}}
			/>
		</div>
	)
}
