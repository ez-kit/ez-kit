'use client'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'

import type { BadgeCellConfig, FieldState } from '@ez-kit/data-grid-react'

const ALL_SENTINEL = '__all__'

/**
 * Badge cell input — picks a value from the configured badge variants.
 * Wraps shadcn Field/Select; renders `<FieldLabel>` only when
 * `field.label` is provided.
 */
export function BadgeCellInput({
	id,
	value,
	onChange,
	onBlur,
	config,
	label,
	description,
	errors,
}: FieldState<BadgeCellConfig>) {
	const hasError = errors.length > 0
	const items = config?.items ?? []
	const selectValue = value != null && value !== '' ? String(value) : ALL_SENTINEL
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Select
				value={selectValue}
				onValueChange={(v) => {
					onChange(v === ALL_SENTINEL ? undefined : v)
				}}
			>
				<SelectTrigger
					id={id}
					onBlur={onBlur}
					aria-invalid={hasError || undefined}
				>
					<SelectValue placeholder='All' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_SENTINEL}>All</SelectItem>
					{items.map((item) => (
						<SelectItem
							key={item.value}
							value={item.value}
						>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}
