'use client'

import { Description, FieldError, Label } from '@heroui/react'

import { NumberFieldControl } from '../core/NumberField'

import type { FieldState } from '@ez-kit/data-grid-react'

type NumberCellFieldProps = FieldState & {
	withSteppers: boolean
}

/**
 * Number cell field on HeroUI v3. `<Label>`, `<Description>` and `<FieldError>` appear only
 * when their data is set.
 *
 * View rendering for `number` is provided by the shared react package
 * (`toLocaleString`) — UI-kit specific styling is unnecessary here.
 */
function NumberCellField({
	id,
	value,
	onChange,
	onBlur,
	label,
	description,
	errors,
	withSteppers,
}: NumberCellFieldProps) {
	const hasError = errors.length > 0
	return (
		<NumberFieldControl
			id={id}
			value={typeof value === 'number' && !Number.isNaN(value) ? value : undefined}
			onChange={onChange}
			onBlur={onBlur}
			isInvalid={hasError}
			withSteppers={withSteppers}
			header={label === undefined ? null : <Label htmlFor={id}>{label}</Label>}
			footer={
				<>
					{description !== undefined && <Description>{description}</Description>}
					{hasError && <FieldError>{errors[0]}</FieldError>}
				</>
			}
		/>
	)
}

/** Number cell editor — with the decrement/increment buttons. */
function NumberCellInput(props: FieldState) {
	return (
		<NumberCellField
			{...props}
			withSteppers
		/>
	)
}

/** Number filter input — the same field without the steppers: a filter value is typed. */
function NumberFilterInput(props: FieldState) {
	return (
		<NumberCellField
			{...props}
			withSteppers={false}
		/>
	)
}

export { NumberCellInput, NumberFilterInput }
