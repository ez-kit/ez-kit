import { Calendar, DateField as HeroDateField, DatePicker, DateRangePicker, RangeCalendar } from '@heroui/react'
import { parseDate } from '@internationalized/date'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'

import type { DateFieldRenderProps, DateRangeFieldRenderProps, DateRangeValue } from '@ez-kit/form-react'
import type { CalendarDate } from '@internationalized/date'
import type { ReactNode } from 'react'

/**
 * The date fields of the HeroUI kit, built on React Aria's `DatePicker` and — because a range
 * is a separate component there, not a mode — `DateRangePicker`.
 *
 * `id` and `onBlur` go on the *root*, not on the segmented input: React Aria splits a date
 * field into one focusable segment per part, so there is no single element to hang them on —
 * the root owns focus management and hands the label the right id itself.
 *
 * The contract speaks `YYYY-MM-DD` strings; React Aria speaks `CalendarDate`. `parseDate`
 * reads exactly that format and `toString()` writes it back, so the conversion is lossless in
 * both directions and no time zone is ever involved — which is the whole reason the format
 * carries calendar dates rather than instants.
 */

/** A contract value → React Aria's value. `null` is React Aria's "nothing selected". */
function toCalendarDate(value: string | undefined): CalendarDate | null {
	return value === undefined ? null : parseDate(value)
}

/** The month grid, identical for both pickers apart from its root. */
function CalendarBody({ Root }: { Root: typeof Calendar | typeof RangeCalendar }): ReactNode {
	return (
		<Root>
			<Root.Header>
				<Root.YearPickerTrigger>
					<Root.YearPickerTriggerHeading />
					<Root.YearPickerTriggerIndicator />
				</Root.YearPickerTrigger>
				<Root.NavButton slot='previous' />
				<Root.NavButton slot='next' />
			</Root.Header>
			<Root.Grid>
				<Root.GridHeader>{(day: string) => <Root.HeaderCell>{day}</Root.HeaderCell>}</Root.GridHeader>
				<Root.GridBody>{(date: CalendarDate) => <Root.Cell date={date} />}</Root.GridBody>
			</Root.Grid>
		</Root>
	)
}

export function DateField({
	value,
	onChange,
	min,
	max,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: DateFieldRenderProps): ReactNode {
	return (
		<DatePicker
			id={id}
			name={name}
			onBlur={onBlur}
			value={toCalendarDate(value)}
			onChange={(next) => {
				onChange(next?.toString())
			}}
			{...(min !== undefined ? { minValue: parseDate(min) } : {})}
			{...(max !== undefined ? { maxValue: parseDate(max) } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<HeroDateField.Group fullWidth>
				<HeroDateField.Input>{(segment) => <HeroDateField.Segment segment={segment} />}</HeroDateField.Input>
				<HeroDateField.Suffix>
					<DatePicker.Trigger>
						<DatePicker.TriggerIndicator />
					</DatePicker.Trigger>
				</HeroDateField.Suffix>
			</HeroDateField.Group>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
			<DatePicker.Popover>
				<CalendarBody Root={Calendar} />
			</DatePicker.Popover>
		</DatePicker>
	)
}

/** React Aria's range value → the contract's, reported only once both ends exist. */
function toRangeValue(range: { start: CalendarDate; end: CalendarDate } | null): DateRangeValue | undefined {
	return range === null ? undefined : { start: range.start.toString(), end: range.end.toString() }
}

export function DateRangeField({
	value,
	onChange,
	min,
	max,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: DateRangeFieldRenderProps): ReactNode {
	const range = value === undefined ? null : { start: parseDate(value.start), end: parseDate(value.end) }

	return (
		<DateRangePicker
			id={id}
			onBlur={onBlur}
			startName={`${name}.start`}
			endName={`${name}.end`}
			value={range}
			onChange={(next) => {
				onChange(toRangeValue(next))
			}}
			{...(min !== undefined ? { minValue: parseDate(min) } : {})}
			{...(max !== undefined ? { maxValue: parseDate(max) } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<HeroDateField.Group fullWidth>
				<HeroDateField.Input slot='start'>
					{(segment) => <HeroDateField.Segment segment={segment} />}
				</HeroDateField.Input>
				<DateRangePicker.RangeSeparator />
				<HeroDateField.Input slot='end'>{(segment) => <HeroDateField.Segment segment={segment} />}</HeroDateField.Input>
				<HeroDateField.Suffix>
					<DateRangePicker.Trigger>
						<DateRangePicker.TriggerIndicator />
					</DateRangePicker.Trigger>
				</HeroDateField.Suffix>
			</HeroDateField.Group>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
			<DateRangePicker.Popover>
				<CalendarBody Root={RangeCalendar} />
			</DateRangePicker.Popover>
		</DateRangePicker>
	)
}
