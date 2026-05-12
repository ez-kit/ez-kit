'use client'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Switch } from '@grid-shadcn/components/ui/switch'

import type { FieldState } from '@ez-kit/data-grid-react'

/**
 * Boolean cell input. Wraps shadcn Field/Switch/FieldError; renders
 * `<FieldLabel>` only when `field.label` is provided.
 */
export function BooleanCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Switch
				id={id}
				checked={Boolean(value)}
				onCheckedChange={(checked) => {
					onChange(checked)
				}}
				onBlur={onBlur}
				aria-invalid={hasError || undefined}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}
