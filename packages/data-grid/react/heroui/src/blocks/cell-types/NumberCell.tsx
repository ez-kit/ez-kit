'use client'

import { Description, FieldError, Input, Label, NumberField } from '@heroui/react'

import type { FieldState } from '@ez-kit/data-grid-react'

/**
 * Number cell input on HeroUI v3. Uses the `<NumberField>` compound which
 * owns the value/onChange of the underlying `<Input>`. `<Label>`,
 * `<Description>`, `<FieldError>` appear only when their data is set.
 *
 * View rendering for `number` is provided by the shared react package
 * (`toLocaleString`) — UI-kit specific styling is unnecessary here.
 */
function NumberCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
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

export { NumberCellInput }
