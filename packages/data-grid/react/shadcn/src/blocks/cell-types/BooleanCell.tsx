'use client'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'
import { Switch } from '@grid-shadcn/components/ui/switch'

import type { CellViewProps, FieldState } from '@ez-kit/data-grid-react'

const ALL_SENTINEL = '__all__'
const TRUE_KEY = 'true'
const FALSE_KEY = 'false'

function BooleanCellView({ value }: CellViewProps) {
	return <>{value ? '✓' : '✗'}</>
}

/**
 * Boolean cell input. Wraps shadcn Field/Switch/FieldError; renders
 * `<FieldLabel>` only when `field.label` is provided.
 */
function BooleanCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
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

/**
 * Tri-state filter for boolean columns — All clears the filter (undefined),
 * Yes/No apply a strict boolean predicate.
 */
function BooleanFilterInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const hasError = errors.length > 0
	const selectValue = value === true ? TRUE_KEY : value === false ? FALSE_KEY : ALL_SENTINEL
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Select
				value={selectValue}
				onValueChange={(v) => {
					if (v === TRUE_KEY) onChange(true)
					else if (v === FALSE_KEY) onChange(false)
					else onChange(undefined)
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
					<SelectItem value={TRUE_KEY}>Yes</SelectItem>
					<SelectItem value={FALSE_KEY}>No</SelectItem>
				</SelectContent>
			</Select>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

export { BooleanCellInput, BooleanCellView, BooleanFilterInput }
