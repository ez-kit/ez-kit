'use client'

import { format, isValid, parseISO } from 'date-fns'

import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Slider } from '../../components/ui/slider'
import { DateCellInput } from '../cell-types/DateCell'

import type { BetweenInputProps, DateRangePreset } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'
import type { DateRange } from 'react-day-picker'

const ISO_DATE_FORMAT = 'yyyy-MM-dd'
const DISPLAY_FORMAT = 'PP'

function toDate(value: unknown): Date | undefined {
	if (value instanceof Date) return isValid(value) ? value : undefined
	if (typeof value !== 'string' || !value) return undefined
	const d = parseISO(value)
	return isValid(d) ? d : undefined
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
			className='flex flex-wrap gap-1'
		>
			{presets.map((p) => (
				<Button
					key={p.id}
					type='button'
					variant='secondary'
					size='sm'
					className='h-6 px-2 text-xs'
					onClick={() => {
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
		<div className='flex flex-col gap-2'>
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
			<div className='flex items-center gap-2 px-1'>
				<span className='min-w-[2ch] text-right text-xs tabular-nums'>{fromVal}</span>
				<Slider
					min={sliderMin}
					max={sliderMax}
					value={[fromVal, toVal]}
					onValueChange={(vals) => {
						onChange({ from: vals[0], to: vals[1] })
					}}
					className='w-24'
				/>
				<span className='min-w-[2ch] text-xs tabular-nums'>{toVal}</span>
			</div>,
		)
	}

	if (variant === 'calendar' && type === 'date') {
		const fromDate = toDate(value.from)
		const toDateVal = toDate(value.to)
		const selected: DateRange | undefined =
			fromDate || toDateVal ? { from: fromDate, to: toDateVal } : undefined
		const displayLabel =
			fromDate && toDateVal
				? `${format(fromDate, DISPLAY_FORMAT)} – ${format(toDateVal, DISPLAY_FORMAT)}`
				: fromDate
					? `${format(fromDate, DISPLAY_FORMAT)} – …`
					: toDateVal
						? `… – ${format(toDateVal, DISPLAY_FORMAT)}`
						: 'Pick a range'

		return withPresets(
			presetRow,
			<Popover>
				<PopoverTrigger asChild>
					<Button
						type='button'
						variant='outline'
						size='sm'
						className='h-7 justify-start gap-2 px-2 text-xs font-normal'
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
						mode='range'
						selected={selected}
						onSelect={(range) => {
							onChange({
								from: range?.from ? format(range.from, ISO_DATE_FORMAT) : undefined,
								to: range?.to ? format(range.to, ISO_DATE_FORMAT) : undefined,
							})
						}}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>,
		)
	}

	if (type === 'date') {
		return withPresets(
			presetRow,
			<div className='flex items-center gap-1'>
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
				<span className='text-muted-foreground text-xs'>–</span>
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
		<div className='flex items-center gap-1'>
			<Input
				type='number'
				placeholder='From'
				className='h-7 w-24 text-xs'
				value={(value.from as number | undefined) ?? ''}
				onChange={(e) => {
					const v = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, from: v })
				}}
			/>
			<span className='text-muted-foreground text-xs'>–</span>
			<Input
				type='number'
				placeholder='To'
				className='h-7 w-24 text-xs'
				value={(value.to as number | undefined) ?? ''}
				onChange={(e) => {
					const v = Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
					onChange({ ...value, to: v })
				}}
			/>
		</div>,
	)
}
