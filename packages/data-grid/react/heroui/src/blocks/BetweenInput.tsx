'use client'

import { Button, Input, Popover, RangeCalendar, Slider } from '@heroui/react'
import { parseDate } from '@internationalized/date'

import { DateCellInput } from './cell-types/DateCell'

import type { BetweenInputProps, DateRangePreset } from '@ez-kit/data-grid-react'
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

function PresetRow({
	presets,
	onPresetSelect,
}: {
	presets: DateRangePreset[]
	onPresetSelect: (preset: DateRangePreset) => void
}) {
	return (
		<div
			data-slot='between-presets'
			className={PRESET_ROW_CLASS}
		>
			{presets.map((p) => (
				<Button
					key={p.id}
					variant='tertiary'
					size='sm'
					onPress={() => {
						onPresetSelect(p)
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

export function BetweenInput({
	value,
	onChange,
	variant,
	type,
	min,
	max,
	presets,
	onPresetSelect,
}: BetweenInputProps) {
	const presetRow =
		presets && presets.length > 0 && onPresetSelect ? (
			<PresetRow
				presets={presets}
				onPresetSelect={onPresetSelect}
			/>
		) : null

	if (variant === 'slider') {
		const sliderMin = min ?? 0
		const sliderMax = max ?? 100
		const fromVal = typeof value.from === 'number' ? value.from : sliderMin
		const toVal = typeof value.to === 'number' ? value.to : sliderMax

		return withPresets(
			presetRow,
			<div
				role='group'
				aria-label='Range filter'
				className='flex items-center gap-2 min-w-[220px]'
			>
				<span className={`${LABEL_CLASS} text-right`}>{fromVal}</span>
				<Slider
					aria-label='Range'
					minValue={sliderMin}
					maxValue={sliderMax}
					value={[fromVal, toVal]}
					onChange={(vals) => {
						if (!Array.isArray(vals)) return
						const [nextFrom, nextTo] = vals
						onChange({ from: nextFrom, to: nextTo })
					}}
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
				<span className={LABEL_CLASS}>{toVal}</span>
			</div>,
		)
	}

	if (variant === 'calendar' && type === 'date') {
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
								<RangeCalendar.GridBody>
									{(date) => <RangeCalendar.Cell date={date} />}
								</RangeCalendar.GridBody>
							</RangeCalendar.Grid>
						</RangeCalendar>
					</Popover.Dialog>
				</Popover.Content>
			</Popover>,
		)
	}

	if (type === 'date') {
		return withPresets(
			presetRow,
			<div className={ROW_CLASS}>
				<DateCellInput
					id='between-from'
					value={value.from}
					onChange={(v) => {
						onChange({ ...value, from: v })
					}}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
				<span aria-hidden>–</span>
				<DateCellInput
					id='between-to'
					value={value.to}
					onChange={(v) => {
						onChange({ ...value, to: v })
					}}
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
				value={(value.from as number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, from: next })
				}}
			/>
			<span aria-hidden>–</span>
			<Input
				type='number'
				placeholder='To'
				value={(value.to as number | undefined) ?? ''}
				{...(min !== undefined ? { min } : {})}
				{...(max !== undefined ? { max } : {})}
				onChange={(e) => {
					const next = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, to: next })
				}}
			/>
		</div>,
	)
}
