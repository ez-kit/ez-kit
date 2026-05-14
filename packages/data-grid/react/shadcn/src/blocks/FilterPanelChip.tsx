'use client'

import { X } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'

import type { FilterPanelChipProps } from '@ez-kit/data-grid-react'
import type { MouseEvent } from 'react'

export function FilterPanelChip({ label, valueDisplay, hasValue, onClear, children }: FilterPanelChipProps) {
	const handleClear = (e: MouseEvent<HTMLButtonElement>): void => {
		e.stopPropagation()
		e.preventDefault()
		onClear()
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant={hasValue ? 'secondary' : 'outline'}
					size='sm'
					className='h-7 gap-1 px-2 text-xs font-normal'
					data-slot='filter-panel-chip'
					data-has-value={hasValue || undefined}
				>
					<span className='font-medium'>{label}:</span>
					<span
						data-slot='filter-panel-chip-value'
						className={hasValue ? '' : 'text-muted-foreground'}
					>
						{valueDisplay}
					</span>
					{hasValue && (
						<span
							role='button'
							tabIndex={0}
							aria-label={`Clear ${label} filter`}
							onClick={handleClear}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									e.stopPropagation()
									onClear()
								}
							}}
							className='ml-1 -mr-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm hover:bg-muted'
						>
							<X className='h-3 w-3' />
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='start'
				className='w-auto min-w-56 p-3'
			>
				<div className='flex flex-col gap-2'>{children}</div>
			</PopoverContent>
		</Popover>
	)
}
