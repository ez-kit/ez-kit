'use client'

import { BetweenBranch, useBetweenValue, useGridMessages } from '@ez-kit/data-grid-react/kit'
import { format, isValid, parseISO } from 'date-fns'
import { useState } from 'react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Calendar } from '@grid-shadcn/components/ui/calendar'
import { Input } from '@grid-shadcn/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@grid-shadcn/components/ui/popover'
import { Slider } from '@grid-shadcn/components/ui/slider'

import type { BetweenInputProps } from '@ez-kit/data-grid-react'
import type { DateRange } from 'react-day-picker'

const ISO_DATE_FORMAT = 'yyyy-MM-dd'
const DISPLAY_FORMAT = 'PP'

function toDate(value: unknown): Date | undefined {
	if (value instanceof Date) return isValid(value) ? value : undefined
	if (typeof value !== 'string' || !value) return undefined
	const d = parseISO(value)
	return isValid(d) ? d : undefined
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
	const messages = useGridMessages()
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
					: messages.cells.pickRange

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
	const messages = useGridMessages()
	const { value, onChange } = props
	const { branch, slider, numbers } = useBetweenValue(props)

	if (branch === BetweenBranch.Slider) {
		return (
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
			</div>
		)
	}

	if (branch === BetweenBranch.DateRange) {
		return (
			<CalendarRange
				value={value}
				onChange={onChange}
			/>
		)
	}

	return (
		<div className='flex items-center gap-1'>
			<Input
				type='number'
				placeholder={messages.filtering.from}
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
				placeholder={messages.filtering.to}
				className='h-7 w-24 text-xs'
				value={numbers.to}
				{...(numbers.min === undefined ? {} : { min: numbers.min })}
				{...(numbers.max === undefined ? {} : { max: numbers.max })}
				onChange={(e) => {
					numbers.onToChange(e.target.valueAsNumber)
				}}
			/>
		</div>
	)
}
