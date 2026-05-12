'use client'

import { Description, FieldError, Input, Label, Link, TextField } from '@heroui/react'

import type { CellViewProps, FieldState } from '@ez-kit/data-grid-react'

function LinkCellView({ value }: CellViewProps) {
	const href = String(value ?? '')
	if (!href) return null
	return (
		<Link
			href={href}
			target='_blank'
			rel='noreferrer'
		>
			{href}
		</Link>
	)
}

/** Link (URL) cell input on HeroUI v3. */
function LinkCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<TextField isInvalid={hasError}>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Input
				id={id}
				type='url'
				value={String(value ?? '')}
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

export { LinkCellInput, LinkCellView }
