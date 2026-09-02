'use client'

import { format, isValid, parseISO } from 'date-fns'

import { Button } from '@grid-shadcn/components/ui/button'
import { Calendar } from '@grid-shadcn/components/ui/calendar'
import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@grid-shadcn/components/ui/popover'

import type { CellViewProps, DateCellConfig, FieldState } from '@ez-kit/data-grid-react'
import type { Matcher } from 'react-day-picker'

const ISO_DATE_FORMAT = 'yyyy-MM-dd'
const DISPLAY_FORMAT = 'PP'

function toDate(value: unknown): Date | undefined {
	if (value instanceof Date) return isValid(value) ? value : undefined
	if (typeof value !== 'string' || !value) return undefined
	const d = parseISO(value)
	return isValid(d) ? d : undefined
}

function DateCellView({ value, config }: CellViewProps<DateCellConfig>) {
	if (value == null || value === '') return null
	const d = value instanceof Date ? value : new Date(String(value))
	if (Number.isNaN(d.getTime())) return <>{String(value)}</>
	return <>{d.toLocaleDateString(undefined, config?.format)}</>
}

/**
 * Date cell input. Wraps shadcn Popover+Calendar; round-trips ISO 8601
 * date strings via `date-fns`. Used for `edit`, `creating`, and `filter`
 * slots — the operator/between system wraps two of these in `<BetweenInput>`
 * for the "between" operator.
 */
function DateCellInput({
	id,
	value,
	onChange,
	onBlur,
	label,
	description,
	errors,
	config,
}: FieldState<DateCellConfig>) {
	const hasError = errors.length > 0
	const selected = toDate(value)
	const minDate = config?.min ? toDate(config.min) : undefined
	const maxDate = config?.max ? toDate(config.max) : undefined
	const displayLabel = selected ? format(selected, DISPLAY_FORMAT) : 'Pick a date'
	const disabledMatchers: Matcher[] = []
	if (minDate) disabledMatchers.push({ before: minDate })
	if (maxDate) disabledMatchers.push({ after: maxDate })
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id={id}
						type='button'
						variant='outline'
						onBlur={onBlur}
						aria-invalid={hasError || undefined}
						data-empty={!selected || undefined}
					>
						{displayLabel}
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className='w-auto p-0'
					align='start'
				>
					<Calendar
						mode='single'
						selected={selected}
						onSelect={(d) => {
							onChange(d ? format(d, ISO_DATE_FORMAT) : undefined)
						}}
						{...(disabledMatchers.length > 0 ? { disabled: disabledMatchers } : {})}
					/>
				</PopoverContent>
			</Popover>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

export { DateCellInput, DateCellView }
