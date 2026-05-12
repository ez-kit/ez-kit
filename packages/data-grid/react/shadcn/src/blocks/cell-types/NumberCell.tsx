'use client'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { FieldState } from '@ez-kit/data-grid-react'

/**
 * Number cell input. Wraps shadcn Field/Input(type='number')/FieldError;
 * renders `<FieldLabel>` only when `field.label` is provided.
 *
 * View rendering for `number` is provided by the shared react package
 * (`toLocaleString`) — UI-kit specific styling is unnecessary here.
 */
function NumberCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : ''
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Input
				id={id}
				type='number'
				value={numericValue}
				onChange={(e) => {
					const n = e.target.valueAsNumber
					onChange(Number.isNaN(n) ? undefined : n)
				}}
				onBlur={onBlur}
				aria-invalid={hasError || undefined}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

export { NumberCellInput }
