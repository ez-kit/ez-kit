'use client'

import { BetweenBranch, useBetweenValue, useGridMessages } from '@ez-kit/data-grid-react'
import { Button, Dropdown, Label, Popover, RangeCalendar, Slider } from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { CalendarClock, Check } from 'lucide-react'

import { DateCellInput } from '../cell-types/DateCell'
import { NumberFieldControl } from '../core/NumberField'

import type { BetweenInputProps, BetweenPresetsController } from '@ez-kit/data-grid-react'
import type { CalendarDate } from '@internationalized/date'
import type { ReactNode } from 'react'

const LABEL_CLASS = 'text-xs tabular-nums min-w-[2ch]'
const ROW_CLASS = 'flex gap-2 items-center'
const PRESET_TRIGGER_CLASS = 'text-xs shrink-0'
const PRESET_CHECK_CLASS = 'ml-auto'
const TRIGGER_CLASS = 'min-w-[12rem] text-xs'
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
	const { branch, presets, slider, numbers, dates } = useBetweenValue(props)
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

	if (branch === BetweenBranch.Calendar) {
		const fromDate = toCalendarDate(value.from)
		const toDateVal = toCalendarDate(value.to)
		const rangeValue = fromDate && toDateVal ? { start: fromDate, end: toDateVal } : null
		const displayLabel =
			fromDate && toDateVal
				? `${fromDate.toString()} – ${toDateVal.toString()}`
				: fromDate
					? `${fromDate.toString()} – …`
					: toDateVal
						? `… – ${toDateVal.toString()}`
						: messages.cells.pickRange

		return withPresets(
			presetMenu,
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
				<Popover.Content>
					<Popover.Dialog aria-label={messages.filtering.dateRange}>
						<RangeCalendar
							aria-label={messages.filtering.dateRange}
							value={rangeValue}
							onChange={(next) => {
								onChange({ from: next.start.toString(), to: next.end.toString() })
							}}
						>
							<RangeCalendar.Header>
								<RangeCalendar.Heading />
								<RangeCalendar.NavButton slot='previous' />
								<RangeCalendar.NavButton slot='next' />
							</RangeCalendar.Header>
							<RangeCalendar.Grid>
								<RangeCalendar.GridHeader>
									{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
								</RangeCalendar.GridHeader>
								<RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
							</RangeCalendar.Grid>
						</RangeCalendar>
					</Popover.Dialog>
				</Popover.Content>
			</Popover>,
		)
	}

	if (branch === BetweenBranch.DateInputs) {
		return withPresets(
			presetMenu,
			<div className={ROW_CLASS}>
				<DateCellInput
					id='between-from'
					value={dates.from}
					onChange={dates.onFromChange}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
				<span aria-hidden>–</span>
				<DateCellInput
					id='between-to'
					value={dates.to}
					onChange={dates.onToChange}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
			</div>,
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
