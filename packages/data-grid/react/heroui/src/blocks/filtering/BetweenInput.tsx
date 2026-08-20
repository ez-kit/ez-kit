'use client'

import { BetweenBranch, useBetweenValue } from '@ez-kit/data-grid-react'
import { Button, Input, Popover, RangeCalendar, Slider } from '@heroui/react'
import { parseDate } from '@internationalized/date'

import { DateCellInput } from '../cell-types/DateCell'

import type { BetweenInputProps, BetweenPresetsController } from '@ez-kit/data-grid-react'
import type { CalendarDate } from '@internationalized/date'
import type { ReactNode } from 'react'

const LABEL_CLASS = 'text-xs tabular-nums min-w-[2ch]'
const ROW_CLASS = 'flex gap-2 items-center'
const COLUMN_CLASS = 'flex flex-col gap-2'
const PRESET_ROW_CLASS = 'flex flex-wrap gap-1'
const TRIGGER_CLASS = 'min-w-[12rem] text-xs'

function toCalendarDate(value: unknown): CalendarDate | null {
	if (typeof value !== 'string' || !value) return null
	try {
		return parseDate(value)
	} catch {
		return null
	}
}

function PresetRow({ items, onSelect }: BetweenPresetsController) {
	return (
		<div
			data-slot='between-presets'
			className={PRESET_ROW_CLASS}
		>
			{items.map((p) => (
				<Button
					key={p.id}
					variant='tertiary'
					size='sm'
					onPress={() => {
						onSelect(p)
					}}
				>
					{p.label}
				</Button>
			))}
		</div>
	)
}

function withPresets(presetRow: ReactNode | null, content: ReactNode): ReactNode {
	if (!presetRow) return content
	return (
		<div className={COLUMN_CLASS}>
			{presetRow}
			{content}
		</div>
	)
}

export function BetweenInput(props: BetweenInputProps) {
	const { value, onChange } = props
	const { branch, presets, slider, numbers, dates } = useBetweenValue(props)
	const presetRow = presets ? <PresetRow {...presets} /> : null

	if (branch === BetweenBranch.Slider) {
		return withPresets(
			presetRow,
			<div
				role='group'
				aria-label='Range filter'
				className='flex items-center gap-2 min-w-[220px]'
			>
				<span className={`${LABEL_CLASS} text-right`}>{slider.values[0]}</span>
				<Slider
					aria-label='Range'
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
						: 'Pick a range'

		return withPresets(
			presetRow,
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
					<Popover.Dialog aria-label='Date range'>
						<RangeCalendar
							aria-label='Date range'
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
			presetRow,
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
		presetRow,
		<div className={ROW_CLASS}>
			<Input
				type='number'
				placeholder='From'
				value={numbers.from}
				{...(numbers.min === undefined ? {} : { min: numbers.min })}
				{...(numbers.max === undefined ? {} : { max: numbers.max })}
				onChange={(e) => {
					numbers.onFromChange(e.target.valueAsNumber)
				}}
			/>
			<span aria-hidden>–</span>
			<Input
				type='number'
				placeholder='To'
				value={numbers.to}
				{...(numbers.min === undefined ? {} : { min: numbers.min })}
				{...(numbers.max === undefined ? {} : { max: numbers.max })}
				onChange={(e) => {
					numbers.onToChange(e.target.valueAsNumber)
				}}
			/>
		</div>,
	)
}
