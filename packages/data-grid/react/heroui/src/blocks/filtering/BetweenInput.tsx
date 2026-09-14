'use client'

import { BetweenBranch, useBetweenValue, useGridMessages } from '@ez-kit/data-grid-react'
import { Button, Popover, RangeCalendar, Slider, useLocale } from '@heroui/react'
import { getLocalTimeZone, parseDate } from '@internationalized/date'

import { NumberFieldControl } from '../core/NumberField'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'
import type { CalendarDate } from '@internationalized/date'

const LABEL_CLASS = 'text-xs tabular-nums min-w-[2ch]'
const ROW_CLASS = 'flex gap-2 items-center'
const TRIGGER_CLASS = 'min-w-[12rem] text-xs'
/**
 * `.range-calendar` is `container-type: inline-size`, so its own width is computed as if it had no
 * content: nothing inside can widen it, and `w-max` collapses it instead. The width has to come from
 * the parent, which is what HeroUI's own multi-month example does with `w-full max-w-none` — two
 * 15.75rem months plus the gap between them.
 */
const POPOVER_CLASS = 'w-[34rem] max-w-none'
const CALENDAR_CLASS = 'w-full max-w-none'
const MONTH_CLASS = 'flex-1'
const MONTHS_CLASS = 'flex gap-6'
const NAV_SPACER_CLASS = 'size-6'
const MONTH_HEADING_CLASS = 'flex-none text-sm font-medium'
const RANGE_END_CLASS = 'flex-1'

function toCalendarDate(value: unknown): CalendarDate | null {
	if (typeof value !== 'string' || !value) return null
	try {
		return parseDate(value)
	} catch {
		return null
	}
}

/**
 * The one control every date column gets: a trigger carrying the committed range, opening a
 * two-month range calendar. react-aria holds the first click as an internal anchor and calls
 * `onChange` only once the second click closes the range, so a half-drawn range never reaches the
 * filter — the same contract the shadcn kit implements by hand.
 */
function DateRangeControl({ value, onChange }: Pick<BetweenInputProps, 'value' | 'onChange'>) {
	const messages = useGridMessages()
	const { locale } = useLocale()
	const fromDate = toCalendarDate(value.from)
	const toDateVal = toCalendarDate(value.to)
	const rangeValue = fromDate && toDateVal ? { start: fromDate, end: toDateVal } : null
	const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })

	const displayLabel =
		fromDate && toDateVal
			? `${fromDate.toString()} – ${toDateVal.toString()}`
			: fromDate
				? `${fromDate.toString()} – …`
				: toDateVal
					? `… – ${toDateVal.toString()}`
					: messages.cells.pickRange

	return (
		<Popover>
			<Popover.Trigger>
				<Button
					variant='tertiary'
					size='sm'
					className={TRIGGER_CLASS}
				>
					<span>{displayLabel}</span>
				</Button>
			</Popover.Trigger>
			<Popover.Content className={POPOVER_CLASS}>
				<Popover.Dialog
					aria-label={messages.filtering.dateRange}
					className={POPOVER_CLASS}
				>
					<RangeCalendar
						aria-label={messages.filtering.dateRange}
						className={CALENDAR_CLASS}
						value={rangeValue}
						visibleDuration={{ months: 2 }}
						onChange={(next) => {
							onChange({ from: next.start.toString(), to: next.end.toString() })
						}}
					>
						{/*
						 * The render prop is how the second month gets its name. Its heading cannot be
						 * composed — HeroUI documents an `offset` on `RangeCalendar.Heading` but 3.0.3 does
						 * not ship it — and it cannot be derived from a controlled `focusedValue` either:
						 * the focused date is not the start of the visible range (react-aria centres the
						 * range, and `selectionAlignment` only applies on the first render), so headings
						 * built from it drift a month away from the grids under them. `state.visibleRange`
						 * is the thing the grids themselves are rendered from.
						 */}
						{({ state }) => (
							<>
								<div className={MONTHS_CLASS}>
									<div className={MONTH_CLASS}>
										<RangeCalendar.Header>
											<RangeCalendar.NavButton slot='previous' />
											<RangeCalendar.YearPickerTrigger>
												{/* Named from `visibleRange`, like the second month: HeroUI's own heading
												    tracks the *focused* date, which after a selection is a month ahead of
												    the grid under it. */}
												<RangeCalendar.YearPickerTriggerHeading>
													{monthFormatter.format(state.visibleRange.start.toDate(getLocalTimeZone()))}
												</RangeCalendar.YearPickerTriggerHeading>
												<RangeCalendar.YearPickerTriggerIndicator />
											</RangeCalendar.YearPickerTrigger>
											<div className={NAV_SPACER_CLASS} />
										</RangeCalendar.Header>
										<RangeCalendar.Grid>
											<RangeCalendar.GridHeader>
												{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
											</RangeCalendar.GridHeader>
											<RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
										</RangeCalendar.Grid>
									</div>
									<div className={MONTH_CLASS}>
										<RangeCalendar.Header>
											<div className={NAV_SPACER_CLASS} />
											<span className={MONTH_HEADING_CLASS}>
												{monthFormatter.format(state.visibleRange.start.add({ months: 1 }).toDate(getLocalTimeZone()))}
											</span>
											<RangeCalendar.NavButton slot='next' />
										</RangeCalendar.Header>
										<RangeCalendar.Grid offset={{ months: 1 }}>
											<RangeCalendar.GridHeader>
												{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
											</RangeCalendar.GridHeader>
											<RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
										</RangeCalendar.Grid>
									</div>
								</div>
								{/* The year picker replaces the month grids while open, so it sits outside both. */}
								<RangeCalendar.YearPickerGrid>
									<RangeCalendar.YearPickerGridBody>
										{({ year }) => <RangeCalendar.YearPickerCell year={year} />}
									</RangeCalendar.YearPickerGridBody>
								</RangeCalendar.YearPickerGrid>
							</>
						)}
					</RangeCalendar>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}

export function BetweenInput(props: BetweenInputProps) {
	const messages = useGridMessages()
	const { value, onChange } = props
	const { branch, slider, numbers } = useBetweenValue(props)

	if (branch === BetweenBranch.Slider) {
		return (
			<div
				role='group'
				aria-label={messages.filtering.range}
				className='flex items-center gap-2 min-w-[220px]'
			>
				<span className={`${LABEL_CLASS} text-right`}>{slider.values[0]}</span>
				<Slider
					aria-label={messages.filtering.range}
					minValue={slider.min}
					maxValue={slider.max}
					value={slider.values}
					onChange={slider.onChange}
					className='flex-1'
				>
					<Slider.Track>
						{({ state }) => (
							<>
								<Slider.Fill />
								{state.values.map((_, i) => (
									<Slider.Thumb
										key={i}
										index={i}
									/>
								))}
							</>
						)}
					</Slider.Track>
				</Slider>
				<span className={LABEL_CLASS}>{slider.values[1]}</span>
			</div>
		)
	}

	if (branch === BetweenBranch.DateRange) {
		return (
			<DateRangeControl
				value={value}
				onChange={onChange}
			/>
		)
	}

	return (
		<div className={ROW_CLASS}>
			<NumberFieldControl
				className={RANGE_END_CLASS}
				aria-label={messages.filtering.from}
				placeholder={messages.filtering.from}
				value={numbers.from === '' ? undefined : numbers.from}
				minValue={numbers.min}
				maxValue={numbers.max}
				onChange={(next) => {
					numbers.onFromChange(next ?? NaN)
				}}
			/>
			<span aria-hidden>–</span>
			<NumberFieldControl
				className={RANGE_END_CLASS}
				aria-label={messages.filtering.to}
				placeholder={messages.filtering.to}
				value={numbers.to === '' ? undefined : numbers.to}
				minValue={numbers.min}
				maxValue={numbers.max}
				onChange={(next) => {
					numbers.onToChange(next ?? NaN)
				}}
			/>
		</div>
	)
}
