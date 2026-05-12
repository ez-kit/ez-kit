'use client'

import { Calendar, DateField, DatePicker, Description, FieldError, Label } from '@heroui/react'
import { parseDate } from '@internationalized/date'

import type { CellViewProps, DateCellConfig, FieldState } from '@ez-kit/data-grid-react'
import type { CalendarDate } from '@internationalized/date'

function toCalendarDate(value: unknown): CalendarDate | null {
	if (typeof value !== 'string' || !value) return null
	try {
		return parseDate(value)
	} catch {
		return null
	}
}

function DateCellView({ value, config }: CellViewProps<DateCellConfig>) {
	if (value == null || value === '') return null
	const d = value instanceof Date ? value : new Date(String(value))
	if (Number.isNaN(d.getTime())) return <>{String(value)}</>
	return <>{d.toLocaleDateString(undefined, config?.format)}</>
}

/**
 * Date cell input on HeroUI v3. Wraps `<DatePicker>` (Calendar compound) and
 * round-trips ISO 8601 date strings via `@internationalized/date`.
 *
 * Used for `edit`, `creating`, and `filter` slots — the operator/between
 * system in the data-grid spawns this input as needed and wraps it in
 * `<BetweenInput>` when the user picks the "between" operator.
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
	const calendarValue = toCalendarDate(value)
	const minValue = toCalendarDate(config?.minValue)
	const maxValue = toCalendarDate(config?.maxValue)
	return (
		<DatePicker
			value={calendarValue}
			onChange={(d) => {
				onChange(d ? d.toString() : undefined)
			}}
			onBlur={onBlur}
			isInvalid={hasError}
			aria-label={label ?? 'Date'}
			{...(minValue ? { minValue } : {})}
			{...(maxValue ? { maxValue } : {})}
		>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<DateField.Group fullWidth>
				<DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
				<DateField.Suffix>
					<DatePicker.Trigger>
						<DatePicker.TriggerIndicator />
					</DatePicker.Trigger>
				</DateField.Suffix>
			</DateField.Group>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
			<DatePicker.Popover>
				<Calendar aria-label={label ?? 'Date'}>
					<Calendar.Header>
						<Calendar.YearPickerTrigger>
							<Calendar.YearPickerTriggerHeading />
							<Calendar.YearPickerTriggerIndicator />
						</Calendar.YearPickerTrigger>
						<Calendar.NavButton slot='previous' />
						<Calendar.NavButton slot='next' />
					</Calendar.Header>
					<Calendar.Grid>
						<Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
						<Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
					</Calendar.Grid>
				</Calendar>
			</DatePicker.Popover>
		</DatePicker>
	)
}

export { DateCellInput, DateCellView }
