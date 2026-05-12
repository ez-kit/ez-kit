'use client'

import { useGridComponents } from '@ez-kit/data-grid-react'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'

import type { FieldState } from '@ez-kit/data-grid-react'

/** Progress (numeric) cell input. Wraps shadcn Field/NumberInput. */
export function ProgressCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const { NumberInput } = useGridComponents()
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
