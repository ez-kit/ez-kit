import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@form-shadcn/components/ui/button'
import { Calendar } from '@form-shadcn/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@form-shadcn/components/ui/popover'

import { FieldShell } from './field-shell'

import type { DateFieldRenderProps, DateRangeFieldRenderProps, DateRangeValue } from '@ez-kit/form-react'
import type { ReactNode } from 'react'
import type { DateRange, Matcher } from 'react-day-picker'

/**
 * The date fields of the shadcn kit: a `Popover` holding a `Calendar`, which is what shadcn
 * itself documents — it ships no DatePicker component, only that recipe.
 *
 * The contract speaks `YYYY-MM-DD` strings; react-day-picker speaks `Date`. Converting
 * between the two is this file's whole job, and it is deliberately done **without** a date
 * library: `new Date('2026-08-31')` parses as UTC midnight while the calendar renders in the
 * local zone, so a naive round-trip loses a day for anyone west of Greenwich. Both directions
 * therefore go through the local-noon construction below.
 */

/** The separator between the two ends of a rendered range. */
const RANGE_SEPARATOR = ' – '

/**
 * `YYYY-MM-DD` → a local-midday `Date`.
 *
 * Midday, not midnight: react-day-picker compares days in the local time zone, and a date
 * built at local midnight can land on the previous day once a DST shift moves the clock
 * backwards. Noon is the standard way to stay inside the intended day under every offset.
 */
function toDate(value: string | undefined): Date | undefined {
	if (value === undefined) return undefined

	const [year, month, day] = value.split('-').map(Number)
	if (year === undefined || month === undefined || day === undefined) return undefined

	return new Date(year, month - 1, day, 12)
}

/** A `Date` → `YYYY-MM-DD`, read in the local zone so it names the day the user clicked. */
function toIsoDate(date: Date | undefined): string | undefined {
	if (date === undefined) return undefined

	const year = String(date.getFullYear()).padStart(4, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

/** What the trigger shows: the date in the viewer's locale, or the placeholder. */
function formatDay(value: string | undefined): string | undefined {
	return toDate(value)?.toLocaleDateString()
}

/**
 * The `min` / `max` bounds as calendar props: `startMonth` / `endMonth` keep the user from
 * paging past them and `disabled` greys out the days themselves.
 *
 * Built once per render rather than spread inline because under `exactOptionalPropertyTypes`
 * an optional prop may not receive an explicit `undefined` — the keys have to be absent, not
 * present-and-undefined.
 */
function calendarBounds(
	min: string | undefined,
	max: string | undefined,
): { startMonth?: Date; endMonth?: Date; disabled?: Matcher[] } {
	const from = toDate(min)
	const to = toDate(max)
	// Two independent matchers rather than one `{ before, after }`: that shape is
	// react-day-picker's `DateInterval`, which requires *both* ends and means "between them".
	const disabled: Matcher[] = [
		...(from === undefined ? [] : [{ before: from }]),
		...(to === undefined ? [] : [{ after: to }]),
	]

	return {
		...(from !== undefined && { startMonth: from }),
		...(to !== undefined && { endMonth: to }),
		...(disabled.length > 0 && { disabled }),
	}
}

/** Opens the calendar on the month already selected, and says nothing when none is. */
function defaultMonthProp(date: Date | undefined): { defaultMonth?: Date } {
	return date === undefined ? {} : { defaultMonth: date }
}

export function DateField({
	value,
	onChange,
	placeholder,
	min,
	max,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: DateFieldRenderProps): ReactNode {
	const [open, setOpen] = useState(false)
	const bounds = calendarBounds(min, max)

	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<>
					{/* The value the picker holds is not in any input, so a plain form submit
					    (and any consumer reading the DOM) would not see it. */}
					<input
						type='hidden'
						name={name}
						value={value ?? ''}
					/>
					<Popover
						open={open}
						onOpenChange={setOpen}
					>
						<PopoverTrigger asChild>
							<Button
								id={id}
								type='button'
								variant='outline'
								disabled={disabled}
								aria-invalid={field.invalid}
								aria-required={required}
								onBlur={onBlur}
								className='w-full justify-between font-normal'
								{...binding}
							>
								{formatDay(value) ?? <span className='text-muted-foreground'>{placeholder ?? 'Pick a date'}</span>}
								<CalendarIcon />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className='w-auto p-0'
							align='start'
						>
							<Calendar
								mode='single'
								selected={toDate(value)}
								{...defaultMonthProp(toDate(value))}
								{...bounds}
								onSelect={(selected) => {
									onChange(toIsoDate(selected))
									setOpen(false)
								}}
							/>
						</PopoverContent>
					</Popover>
				</>
			)}
		</FieldShell>
	)
}

/** The trigger's label for a range: both ends, one end while picking, or the placeholder. */
function formatRange(value: DateRangeValue | undefined, selected: DateRange | undefined): string | undefined {
	if (value !== undefined) return `${formatDay(value.start) ?? ''}${RANGE_SEPARATOR}${formatDay(value.end) ?? ''}`
	return selected?.from === undefined ? undefined : toIsoDate(selected.from) && selected.from.toLocaleDateString()
}

export function DateRangeField({
	value,
	onChange,
	placeholder,
	min,
	max,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: DateRangeFieldRenderProps): ReactNode {
	const [open, setOpen] = useState(false)
	/**
	 * The half-picked range lives here, not in form state: the contract reports a range only
	 * once both ends exist, so an open-ended selection has nowhere else to go — and the
	 * calendar has to show it, or picking would look broken.
	 *
	 * Unlike the single-date field, this popover does **not** close on select. react-day-picker
	 * reports the first click as a one-day range (`from === to`), which is a legitimate value —
	 * closing there would make it impossible to extend the range to a second day.
	 */
	const [draft, setDraft] = useState<DateRange | undefined>(undefined)
	const bounds = calendarBounds(min, max)
	const selected: DateRange | undefined =
		value === undefined ? draft : { from: toDate(value.start), to: toDate(value.end) }

	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<>
					<input
						type='hidden'
						name={`${name}.start`}
						value={value?.start ?? ''}
					/>
					<input
						type='hidden'
						name={`${name}.end`}
						value={value?.end ?? ''}
					/>
					<Popover
						open={open}
						onOpenChange={setOpen}
					>
						<PopoverTrigger asChild>
							<Button
								id={id}
								type='button'
								variant='outline'
								disabled={disabled}
								aria-invalid={field.invalid}
								aria-required={required}
								onBlur={onBlur}
								className='w-full justify-between font-normal'
								{...binding}
							>
								{formatRange(value, selected) ?? (
									<span className='text-muted-foreground'>{placeholder ?? 'Pick a date range'}</span>
								)}
								<CalendarIcon />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className='w-auto p-0'
							align='start'
						>
							<Calendar
								mode='range'
								numberOfMonths={2}
								selected={selected}
								{...defaultMonthProp(selected?.from)}
								{...bounds}
								onSelect={(range) => {
									const start = toIsoDate(range?.from)
									const end = toIsoDate(range?.to)
									if (start !== undefined && end !== undefined) {
										setDraft(undefined)
										onChange({ start, end })
										return
									}
									// Still picking: keep the open end on screen and leave form state empty.
									setDraft(range)
									onChange(undefined)
								}}
							/>
						</PopoverContent>
					</Popover>
				</>
			)}
		</FieldShell>
	)
}
