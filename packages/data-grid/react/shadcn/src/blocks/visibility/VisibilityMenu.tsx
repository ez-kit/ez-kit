'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { ArrowDown, ArrowUp, Columns2 } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Checkbox } from '@grid-shadcn/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@grid-shadcn/components/ui/popover'
import { cn } from '@grid-shadcn/lib/utils'

import type { VisibilityColumnItem, VisibilityMenuProps } from '@ez-kit/data-grid-react'

/**
 * The move pair, drawn as arrows along the list rather than along the table.
 *
 * The contract names the two moves logically — `start` / `end`, because the column order flips
 * under RTL — and leaves the glyph to the kit. This list runs top to bottom in both writing
 * directions, so up and down are what the arrows honestly point at.
 */
function MoveControls({ column, labels }: { column: VisibilityColumnItem; labels: { start: string; end: string } }) {
	const ordering = column.ordering
	if (!ordering) return null
	return (
		<>
			<Button
				aria-label={`${labels.start}: ${column.label}`}
				className='size-6'
				data-slot='column-visibility-move-start'
				disabled={!ordering.canMoveStart}
				size='icon-xs'
				variant='ghost'
				onClick={ordering.onMoveStart}
			>
				<ArrowUp />
			</Button>
			<Button
				aria-label={`${labels.end}: ${column.label}`}
				className='size-6'
				data-slot='column-visibility-move-end'
				disabled={!ordering.canMoveEnd}
				size='icon-xs'
				variant='ghost'
				onClick={ordering.onMoveEnd}
			>
				<ArrowDown />
			</Button>
		</>
	)
}

export function VisibilityMenu({ columns }: VisibilityMenuProps) {
	const messages = useGridMessages()
	// Every row carries the pair or none does, so the popover's width is decided once.
	const withOrdering = columns.some((col) => col.ordering !== undefined)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					className='h-8 gap-1.5'
					data-slot='column-visibility-trigger'
					size='sm'
					variant='outline'
				>
					<Columns2 className='h-4 w-4' />
					{messages.visibility.trigger}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='end'
				className={cn('p-2', withOrdering ? 'w-60' : 'w-48')}
			>
				<div className='space-y-1'>
					{columns.map((col) => (
						<div
							key={col.id}
							className='flex items-center gap-1 rounded pe-1 hover:bg-muted'
							data-slot='column-visibility-item'
						>
							{/*
							 * The label wraps only the checkbox and the name: a button inside a
							 * `<label>` would toggle the column on its way to moving it.
							 */}
							<label
								className={cn(
									'flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm',
									col.canHide ? 'cursor-pointer' : 'cursor-default',
								)}
								htmlFor={`col-vis-${col.id}`}
							>
								<Checkbox
									checked={col.isVisible}
									disabled={!col.canHide}
									id={`col-vis-${col.id}`}
									onCheckedChange={() => {
										col.onToggle()
									}}
								/>
								<span className='truncate'>{col.label}</span>
							</label>
							<MoveControls
								column={col}
								labels={{ start: messages.visibility.moveStart, end: messages.visibility.moveEnd }}
							/>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}
