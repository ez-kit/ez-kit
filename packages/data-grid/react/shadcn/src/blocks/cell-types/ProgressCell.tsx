'use client'

import { useGridComponents } from '@ez-kit/data-grid-react'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Progress } from '@grid-shadcn/components/ui/progress'

import type { CellViewProps, FieldState, ProgressCellConfig } from '@ez-kit/data-grid-react'

function ProgressCellView({ value, config }: CellViewProps<ProgressCellConfig>) {
	const max = config?.max ?? 100
	const num = Number(value)
	const pct = Number.isFinite(num) ? (num / max) * 100 : 0

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
			<Progress
				value={pct}
				style={{ flex: 1 }}
			/>
			<span style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
		</span>
	)
}

/** Progress (numeric) cell input. Wraps shadcn Field/NumberInput. */
function ProgressCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const { NumberInput } = useGridComponents().core
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<NumberInput
				value={typeof value === 'number' ? value : undefined}
				onChange={onChange}
				onBlur={onBlur}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

export { ProgressCellInput, ProgressCellView }
