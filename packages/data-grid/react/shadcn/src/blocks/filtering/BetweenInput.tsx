'use client'

import { BetweenBranch, useBetweenValue } from '@ez-kit/data-grid-react'
import { format, isValid, parseISO } from 'date-fns'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Slider } from '../../components/ui/slider'
import { DateCellInput } from '../cell-types/DateCell'

import type { BetweenInputProps, BetweenPresetsController } from '@ez-kit/data-grid-react'
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

function PresetRow({ items, onSelect }: BetweenPresetsController) {
	return (
		<div
			data-slot='between-presets'
			className='flex flex-wrap gap-1'
		>
			{items.map((p) => (
				<Button
					key={p.id}
					type='button'
					variant='secondary'
					size='sm'
					className='h-6 px-2 text-xs'
					onClick={() => {
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
		<div className='flex flex-col gap-2'>
			{presetRow}
			{content}
		</div>
	)
}

/**
 * Date-range picker that publishes only a **complete** range.
 *
 * react-day-picker resolves the very first click to a same-day range — `addToRange` returns
 * `{ from: day, to: day }` while `min` is 0 — so forwarding every `onSelect` would apply a
 * one-day filter on the way to the range the user is actually drawing, and fire a request for
 * it on a server-driven grid. The first click is held here instead and the filter is written
 * once the second click closes the range.
 *
 * That also matches the heroui kit, which gets the same behaviour for free: react-aria's
 * `useRangeCalendarState` keeps the first click as an internal `anchorDate` and calls
 * `onChange` only once a second click completes the range.
 *
 * The range is built from `triggerDate` (the clicked day) rather than from the range
 * react-day-picker computes, so a click always either opens a fresh selection or closes the
 * pending one — never edits one edge of an already-committed range, which is the behaviour
 * react-aria has and react-day-picker does not.
 */
function CalendarRange({ value, onChange }: Pick<BetweenInputProps, 'value' | 'onChange'>) {
	const [anchor, setAnchor] = useState<Date | undefined>(undefined)

	const fromDate = toDate(value.from)
	const toDateVal = toDate(value.to)
	const selected: DateRange | undefined = anchor
		? { from: anchor, to: anchor }
		: fromDate || toDateVal
			? { from: fromDate, to: toDateVal }
			: undefined

	const displayLabel = anchor
		? `${format(anchor, DISPLAY_FORMAT)} – …`
		: fromDate && toDateVal
			? `${format(fromDate, DISPLAY_FORMAT)} – ${format(toDateVal, DISPLAY_FORMAT)}`
			: fromDate
				? `${format(fromDate, DISPLAY_FORMAT)} – …`
				: toDateVal
					? `… – ${format(toDateVal, DISPLAY_FORMAT)}`
					: 'Pick a range'

	const handleSelect = (_range: DateRange | undefined, triggerDate: Date): void => {
		if (!anchor) {
			setAnchor(triggerDate)
			return
		}
		const [start, end] = triggerDate.getTime() < anchor.getTime() ? [triggerDate, anchor] : [anchor, triggerDate]
		setAnchor(undefined)
		onChange({ from: format(start, ISO_DATE_FORMAT), to: format(end, ISO_DATE_FORMAT) })
	}

	return (
		<Popover
			onOpenChange={(isOpen) => {
				// Drop a half-drawn range rather than leaving it pending behind a closed popover.
				if (!isOpen) setAnchor(undefined)
			}}
		>
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
					onSelect={handleSelect}
					numberOfMonths={2}
				/>
			</PopoverContent>
		</Popover>
	)
}

export function BetweenInput(props: BetweenInputProps) {
	const { value, onChange } = props
	const { branch, presets, slider, numbers, dates } = useBetweenValue(props)
	const presetRow = presets ? <PresetRow {...presets} /> : null

	if (branch === BetweenBranch.Slider) {
		return withPresets(
			presetRow,
			<div className='flex items-center gap-2 px-1'>
				<span className='min-w-[2ch] text-right text-xs tabular-nums'>{slider.values[0]}</span>
				<Slider
					min={slider.min}
					max={slider.max}
					value={slider.values}
					onValueChange={slider.onChange}
					className='w-24'
				/>
				<span className='min-w-[2ch] text-xs tabular-nums'>{slider.values[1]}</span>
			</div>,
		)
	}

	if (branch === BetweenBranch.Calendar) {
		return withPresets(
			presetRow,
			<CalendarRange
				value={value}
				onChange={onChange}
			/>,
		)
	}

	if (branch === BetweenBranch.DateInputs) {
		return withPresets(
			presetRow,
			<div className='flex items-center gap-1'>
				<DateCellInput
					id='between-from'
					value={dates.from}
					onChange={dates.onFromChange}
					onBlur={() => {}}
					error={undefined}
					errors={[]}
					isValidating={false}
				/>
				<span className='text-muted-foreground text-xs'>–</span>
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
		<div className='flex items-center gap-1'>
			<Input
				type='number'
				placeholder='From'
				className='h-7 w-24 text-xs'
				value={numbers.from}
				{...(numbers.min === undefined ? {} : { min: numbers.min })}
				{...(numbers.max === undefined ? {} : { max: numbers.max })}
				onChange={(e) => {
					numbers.onFromChange(e.target.valueAsNumber)
				}}
			/>
			<span className='text-muted-foreground text-xs'>–</span>
			<Input
				type='number'
				placeholder='To'
				className='h-7 w-24 text-xs'
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
