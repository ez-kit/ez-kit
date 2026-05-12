'use client'

import { Button } from '@grid-shadcn/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Input } from '@grid-shadcn/components/ui/input'

import type { CellViewProps, FieldState } from '@ez-kit/data-grid-react'

function LinkCellView({ value }: CellViewProps) {
	const href = String(value ?? '')

	if (!href) return null

	return (
		<Button
			variant='link'
			asChild
		>
			<a
				href={href}
				target='_blank'
				rel='noreferrer'
			>
				{href}
			</a>
		</Button>
	)
}

/** Link (URL) cell input. Wraps shadcn Field/Input(type='url'). */
function LinkCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Input
				id={id}
				type='url'
				value={String(value ?? '')}
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

export { LinkCellInput, LinkCellView }
