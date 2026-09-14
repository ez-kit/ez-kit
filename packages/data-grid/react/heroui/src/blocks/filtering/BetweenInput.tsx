'use client'

import { BetweenBranch, useBetweenValue, useGridMessages } from '@ez-kit/data-grid-react'
import { Button, Dropdown, Label, Popover, RangeCalendar, Slider, useLocale } from '@heroui/react'
import { getLocalTimeZone, parseDate } from '@internationalized/date'
import { CalendarClock, Check } from 'lucide-react'

import { NumberFieldControl } from '../core/NumberField'

import type { BetweenInputProps, BetweenPresetsController } from '@ez-kit/data-grid-react'
import type { CalendarDate } from '@internationalized/date'
import type { ReactNode } from 'react'

const LABEL_CLASS = 'text-xs tabular-nums min-w-[2ch]'
const ROW_CLASS = 'flex gap-2 items-center'
const PRESET_TRIGGER_CLASS = 'text-xs shrink-0'
const PRESET_CHECK_CLASS = 'ml-auto'
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
 * The presets as a menu rather than a row of chips: this control also renders inline in the
 * column header, where six wrapped chips pushed the whole header row to three lines tall.
 * One trigger keeps the filter on the line it shares with the operator select, in every
 * context the between-input is mounted in.
 */
function PresetMenu({ items, onSelect, activeId }: BetweenPresetsController) {
	const messages = useGridMessages()
	const active = items.find((preset) => preset.id === activeId)

	return (
		// The Button is a direct child of `Dropdown`, not wrapped in `Dropdown.Trigger`: that
		// element renders its own `<button>` around this one, which is invalid HTML and breaks
		// hydration — same shape as the row menu in `core/Menu`.
		<Dropdown>
			<Button
				variant='tertiary'
				size='sm'
				// Only while nothing is picked: an `aria-label` would otherwise override the visible
				// preset name as the button's accessible name.
				{...(active ? {} : { 'aria-label': messages.filtering.presets })}
				data-slot='between-presets'
				data-active-preset={activeId ?? undefined}
				className={PRESET_TRIGGER_CLASS}
			>
				<CalendarClock
					size={14}
					aria-hidden
				/>
				{active ? <span>{active.label}</span> : null}
			</Button>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label={messages.filtering.presets}
					onAction={(key) => {
						const preset = items.find((entry) => entry.id === key)
						if (preset) onSelect(preset)
					}}
				>
					{items.map((preset) => (
						<Dropdown.Item
							key={preset.id}
							id={preset.id}
							textValue={preset.label}
						>
							<Label>{preset.label}</Label>
							{preset.id === activeId && (
								<Check
									size={14}
									className={PRESET_CHECK_CLASS}
									aria-hidden
								/>
							)}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
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

/** Trailing, so the menu sits next to the operator select `renderFilterInput` renders after it. */
function withPresets(presetMenu: ReactNode | null, content: ReactNode): ReactNode {
	if (!presetMenu) return content
	return (
		<div className={ROW_CLASS}>
			{content}
			{presetMenu}
		</div>
	)
}

export function BetweenInput(props: BetweenInputProps) {
	const messages = useGridMessages()
	const { value, onChange } = props
	const { branch, presets, slider, numbers } = useBetweenValue(props)
	const presetMenu = presets ? <PresetMenu {...presets} /> : null

	if (branch === BetweenBranch.Slider) {
		return withPresets(
			presetMenu,
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
			</div>,
		)
	}

	if (branch === BetweenBranch.DateRange) {
		return withPresets(
			presetMenu,
			<DateRangeControl
				value={value}
				onChange={onChange}
			/>,
		)
	}

	return withPresets(
		presetMenu,
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
		</div>,
	)
}
