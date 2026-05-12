'use client'

import { Description, FieldError, Input, Label, NumberField, ProgressBar } from '@heroui/react'

import type { CellViewProps, FieldState, ProgressCellConfig } from '@ez-kit/data-grid-react'

function ProgressCellView({ value, config }: CellViewProps<ProgressCellConfig>) {
	const max = config?.max ?? 100
	const num = Number(value)
	const pct = Number.isFinite(num) ? (num / max) * 100 : 0
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
			<ProgressBar
				value={pct}
				style={{ flex: 1 }}
			>
				<ProgressBar.Track>
					<ProgressBar.Fill />
				</ProgressBar.Track>
			</ProgressBar>
			<span style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
		</span>
	)
}

/** Progress (numeric) cell input on HeroUI v3. */
function ProgressCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : NaN
	return (
		<NumberField
			value={numericValue}
			onChange={(n) => {
				onChange(Number.isNaN(n) ? undefined : n)
			}}
			isInvalid={hasError}
		>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Input
				id={id}
				onBlur={onBlur}
			/>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</NumberField>
	)
}

export { ProgressCellInput, ProgressCellView }
