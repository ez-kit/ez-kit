'use client'

import { Description, FieldError, Input, Label, TextField } from '@heroui/react'

import type { FieldState } from '@ez-kit/data-grid-react'

/**
 * Default text cell input on HeroUI v3. Wraps `<TextField>` (always rendered);
 * `<Label>`, `<Description>`, `<FieldError>` appear only when their data is set.
 */
export function TextCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<TextField isInvalid={hasError}>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Input
				id={id}
				value={(value ?? '') as string}
				onChange={(e) => {
					onChange(e.target.value)
				}}
				onBlur={onBlur}
			/>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</TextField>
	)
}
