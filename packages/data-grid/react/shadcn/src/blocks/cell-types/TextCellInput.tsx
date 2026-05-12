'use client'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { FieldState } from '@ez-kit/data-grid-react'

/**
 * Default text cell input. Wraps shadcn Field/Input/FieldError; renders
 * `<FieldLabel>` only when `field.label` is provided (form-context).
 * In inline contexts (cell-mode editing, creating-row, filter) the wrapper
 * still renders, but contains only the bare `<Input>`.
 */
export function TextCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Input
				id={id}
				value={(value ?? '') as string}
				onChange={(e) => {
					onChange(e.target.value)
				}}
				onBlur={onBlur}
				aria-invalid={hasError || undefined}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}
