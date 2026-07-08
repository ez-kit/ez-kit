'use client'

import { X } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { cn } from '@grid-shadcn/lib/utils'

import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	const hasActions = Boolean(onDelete) || Boolean(actions)

	if (variant === 'inline') {
		if (!open) return null

		return (
			<div
				role='toolbar'
				aria-orientation='horizontal'
				data-slot='selection-bar'
				data-variant='inline'
				data-state='open'
				className='mb-2 flex w-full flex-row items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm'
			>
				<div
					data-slot='action-bar-selection'
					className='font-medium tabular-nums'
				>
					{count} selected
				</div>

				<div className='ml-auto flex items-center gap-2'>
					{onDelete && (
						<Button
							variant='destructive'
							size='sm'
							onClick={onDelete}
						>
							Delete
						</Button>
					)}

					{actions}

					<Button
						variant='ghost'
						size='icon'
						data-slot='selection-bar-close'
						onClick={onClear}
						aria-label='Clear selection'
					>
						<X />
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div
			role='toolbar'
			aria-orientation='horizontal'
			data-slot='selection-bar'
			data-variant='floating'
			data-state={open ? 'open' : 'closed'}
			className={cn(
				'sticky bottom-2 z-10 mx-auto w-fit',
				'flex flex-row items-center gap-2 rounded-lg border bg-card px-2 py-1.5 shadow-lg',
				'transition-all duration-250 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]',
				open ? 'animate-in fade-in-0 slide-in-from-bottom-4' : 'pointer-events-none translate-y-4 opacity-0',
			)}
		>
			{/* Selected count badge */}
			<div
				data-slot='action-bar-selection'
				className='flex items-center gap-1 rounded-sm border px-2 py-1 font-medium text-sm tabular-nums'
			>
				{count} selected
			</div>

			{/* Separator — only when there are action buttons to divide from the count */}
			{hasActions && (
				<div
					role='separator'
					aria-orientation='horizontal'
					aria-hidden='true'
					className='h-6 w-px bg-border'
				/>
			)}

			{/* Delete — only when handler provided */}
			{onDelete && (
				<Button
					variant='destructive'
					size='sm'
					onClick={onDelete}
				>
					Delete
				</Button>
			)}

			{/* Custom actions slot */}
			{actions}

			{/* Separator before Cancel */}
			<div
				role='separator'
				aria-orientation='horizontal'
				aria-hidden='true'
				className='h-6 w-px bg-border'
			/>

			{/* Cancel / Clear */}
			<Button
				variant='ghost'
				size='icon'
				data-slot='selection-bar-close'
				onClick={onClear}
				aria-label='Clear selection'
			>
				<X />
			</Button>
		</div>
	)
}
