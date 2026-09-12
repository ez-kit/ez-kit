'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'

import type { CellViewProps, FieldState, SelectCellConfig } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

const ALL_SENTINEL = '__all__'

function SelectCellView({ value, config }: CellViewProps<SelectCellConfig>) {
	const items = config?.items ?? []
	const match = items.find((item) => item.value === String(value ?? ''))
	if (!match) return <>{String(value ?? '')}</>
	return (
		<span data-slot='select-cell-value'>
			{(match.icon as ReactNode) ?? null}
			{match.label}
		</span>
	)
}

/**
 * Select cell input. Wraps shadcn Field/Select; renders `<FieldLabel>` only
 * when `field.label` is provided.
 */
function SelectCellInput({
	id,
	value,
	onChange,
	onBlur,
	config,
	label,
	description,
	errors,
}: FieldState<SelectCellConfig>) {
	const messages = useGridMessages()
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
					<SelectValue placeholder={messages.cells.all} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_SENTINEL}>{messages.cells.all}</SelectItem>
					{items.map((item) => (
						<SelectItem
							key={item.value}
							value={item.value}
						>
							{(item.icon as ReactNode) ?? null}
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

export { SelectCellInput, SelectCellView }
