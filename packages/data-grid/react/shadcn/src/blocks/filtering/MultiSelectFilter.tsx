'use client'

import { buildMultiSelectLabel, useGridMessages } from '@ez-kit/data-grid-react/kit'
import { useMemo, useState } from 'react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Checkbox } from '@grid-shadcn/components/ui/checkbox'
import { Input } from '@grid-shadcn/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@grid-shadcn/components/ui/popover'
import { Spinner } from '@grid-shadcn/components/ui/spinner'
import { KIT_CLASS_NAME } from '@grid-shadcn/lib/kit-class-name'
import { cn } from '@grid-shadcn/lib/utils'

import { ListStateAnnouncer } from '../items-list-state'

import type { MultiSelectFilterProps } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

const TRIGGER_BASE = 'h-7 min-w-[8rem] justify-between gap-2 px-2 text-xs font-normal'

export function MultiSelectFilter({
	items,
	selectedValues,
	onChange,
	label,
	placeholder,
	itemsLoading: isLoading,
	itemsError: error,
}: MultiSelectFilterProps) {
	const messages = useGridMessages()
	const [query, setQuery] = useState('')

	const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])

	const filteredOptions = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return items
		return items.filter((opt) => opt.label.toLowerCase().includes(q))
	}, [items, query])

	const toggle = (value: string): void => {
		const next = selectedSet.has(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value]
		onChange(next)
	}

	const clear = (): void => {
		onChange([])
	}

	const triggerLabel = buildMultiSelectLabel(items, selectedValues, placeholder)
	// Named by `label` and by what it shows: the text alone may be an author's hint or a bare
	// "Open, Done" with no column in it, and `label` alone would leave a speech-input user unable
	// to say what they see (WCAG 2.5.3). React Aria's Select composes the same pair in HeroUI.
	const triggerName = label === undefined || label === triggerLabel ? label : `${label}, ${triggerLabel}`

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						type='button'
						variant='outline'
						size='sm'
						className={TRIGGER_BASE}
						{...(triggerName !== undefined ? { 'aria-label': triggerName } : {})}
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
					className={cn(KIT_CLASS_NAME, 'w-64 p-2')}
				>
					<div className='flex flex-col gap-2'>
						<Input
							type='search'
							placeholder={messages.filtering.search}
							value={query}
							onChange={(e) => {
								setQuery(e.target.value)
							}}
							className='h-7 text-xs'
						/>
						<div
							role='group'
							aria-label={label ?? placeholder ?? 'Filter'}
							aria-busy={isLoading === true || undefined}
							className='max-h-56 overflow-auto'
						>
							{isLoading === true && (
								<div
									data-slot='multi-select-loading'
									className='flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground'
								>
									<Spinner
										aria-hidden
										className='size-3'
									/>
									{messages.fallbacks.loading}
								</div>
							)}
							{error !== undefined && (
								<div
									data-slot='multi-select-error'
									className='px-2 py-1 text-xs text-destructive'
								>
									{messages.filtering.itemsError}
								</div>
							)}
							{filteredOptions.length === 0 ? (
								// An empty list that is loading or failed already says so above; "No results"
								// would claim the search matched nothing.
								isLoading === true || error !== undefined ? null : (
									<div className='px-2 py-1 text-xs text-muted-foreground'>{messages.filtering.noResults}</div>
								)
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
											<span className='flex flex-1 items-center gap-1.5 truncate'>
												{(opt.icon as ReactNode) ?? null}
												{opt.label}
											</span>
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
									{messages.filtering.clear}
								</Button>
							</div>
						)}
					</div>
				</PopoverContent>
			</Popover>
			<ListStateAnnouncer
				isLoading={isLoading === true}
				error={error}
			/>
		</>
	)
}
