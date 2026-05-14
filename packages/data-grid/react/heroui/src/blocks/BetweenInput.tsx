'use client'

import { Button, Input, Popover, RangeCalendar, Slider } from '@heroui/react'
import { parseDate } from '@internationalized/date'

import { DateCellInput } from './cell-types/DateCell'

import type { BetweenInputProps, DateRangePreset } from '@ez-kit/data-grid-react'
import type { CalendarDate } from '@internationalized/date'
import type { ReactNode } from 'react'

const LABEL_STYLE = {
	fontSize: '0.75rem',
	fontVariantNumeric: 'tabular-nums' as const,
	minWidth: '2ch',
}

const ROW_STYLE = {
	display: 'flex',
	gap: '0.5rem',
	alignItems: 'center',
} as const

const COLUMN_STYLE = {
	display: 'flex',
	flexDirection: 'column' as const,
	gap: '0.5rem',
}

const PRESET_ROW_STYLE = {
	display: 'flex',
	flexWrap: 'wrap' as const,
	gap: '0.25rem',
}

const TRIGGER_STYLE = {
	minWidth: '12rem',
	fontSize: '0.75rem',
} as const

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
			style={PRESET_ROW_STYLE}
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
		<div style={COLUMN_STYLE}>
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
				style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 220 }}
			>
				<span style={{ ...LABEL_STYLE, textAlign: 'right' }}>{fromVal}</span>
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
					style={{ flex: 1 }}
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
				<span style={LABEL_STYLE}>{toVal}</span>
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
						style={TRIGGER_STYLE}
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
			<div style={ROW_STYLE}>
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
		<div style={ROW_STYLE}>
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
