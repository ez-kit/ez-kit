'use client'

import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'

import type { MultiSelectFilterProps } from '@ez-kit/data-grid-react'

const TRIGGER_BASE = 'h-7 min-w-[8rem] justify-between gap-2 px-2 text-xs font-normal'

export function MultiSelectFilter({ options, selectedValues, onChange, placeholder }: MultiSelectFilterProps) {
	const [query, setQuery] = useState('')

	const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])

	const filteredOptions = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return options
		return options.filter((opt) => opt.label.toLowerCase().includes(q))
	}, [options, query])

	const toggle = (value: string): void => {
		const next = selectedSet.has(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value]
		onChange(next)
	}

	const clear = (): void => {
		onChange([])
	}

	const triggerLabel =
		selectedValues.length === 0
			? (placeholder ?? 'Select…')
			: selectedValues.length === 1
				? (options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0])
				: `${String(selectedValues.length)} selected`

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='outline'
					size='sm'
					className={TRIGGER_BASE}
				>
					<span className='truncate'>{triggerLabel}</span>
					<span
						aria-hidden
						className='text-muted-foreground'
					>
						▾
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='start'
				className='w-64 p-2'
			>
				<div className='flex flex-col gap-2'>
					<Input
						type='search'
						placeholder='Search…'
						value={query}
						onChange={(e) => {
							setQuery(e.target.value)
						}}
						className='h-7 text-xs'
					/>
					<div
						role='group'
						aria-label={placeholder ?? 'Filter'}
						className='max-h-56 overflow-auto'
					>
						{filteredOptions.length === 0 ? (
							<div className='px-2 py-1 text-xs text-muted-foreground'>No results</div>
						) : (
							filteredOptions.map((opt) => {
								const isSelected = selectedSet.has(opt.value)
								return (
									<label
										key={opt.value}
										className='flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent'
									>
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => {
												toggle(opt.value)
											}}
										/>
										<span className='flex-1 truncate'>{opt.label}</span>
										{opt.count !== undefined && (
											<span
												data-slot='count'
												className='tabular-nums text-muted-foreground'
											>
												{opt.count}
											</span>
										)}
									</label>
								)
							})
						)}
					</div>
					{selectedValues.length > 0 && (
						<div className='flex justify-end border-t pt-2'>
							<Button
								type='button'
								variant='ghost'
								size='sm'
								className='h-6 text-xs'
								onClick={clear}
							>
								Clear
							</Button>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	)
}
