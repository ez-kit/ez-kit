'use client'

import { Description, FieldError, Label, Switch } from '@heroui/react'

import type { FieldState } from '@ez-kit/data-grid-react'

/**
 * Boolean cell input on HeroUI v3. HeroUI `<Switch>` has no native FieldError
 * slot, so we render it as a sibling. `<Label>` / `<Description>` live inside
 * `<Switch.Content>`; both are conditional.
 */
export function BooleanCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const hasContent = label !== undefined || description !== undefined
	return (
		<div data-error={hasError || undefined}>
			<Switch
				id={id}
				isSelected={Boolean(value)}
				onChange={(checked) => {
					onChange(checked)
				}}
				onBlur={onBlur}
			>
				<Switch.Control>
					<Switch.Thumb />
				</Switch.Control>
				{hasContent && (
					<Switch.Content>
						{label !== undefined && <Label>{label}</Label>}
						{description !== undefined && <Description>{description}</Description>}
					</Switch.Content>
				)}
			</Switch>
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</div>
	)
}
