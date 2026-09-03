'use client'

import { ActionBarVariant } from '@ez-kit/data-grid-react'
import { X } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { cn } from '@grid-shadcn/lib/utils'

import { renderActionIcon } from '../icons'

import type { GridMenuItem, SelectionBarProps } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

/**
 * One `selection.bar.actions` entry as a button, matching the built-in Delete beside it: the
 * kit's glyph for a named icon, its danger colour for a destructive entry, its disabled state.
 * This is what the config buys over hand-drawn markup.
 */
function ActionButton({ item }: { item: GridMenuItem }) {
	const icon = renderActionIcon(item.icon)

	return (
		<Button
			variant={item.destructive === true ? 'destructive' : 'outline'}
			size='sm'
			disabled={item.disabled === true}
			data-slot='selection-bar-action'
			onClick={item.onSelect}
		>
			{icon}
			{item.label}
		</Button>
	)
}

/** The entries as buttons — `undefined` when the bar was given none, so separators can tell. */
function renderActions(actions: GridMenuItem[] | undefined): ReactNode {
	if (actions === undefined || actions.length === 0) return null
	return actions.map((item) => (
		<ActionButton
			key={item.id}
			item={item}
		/>
	))
}

export function SelectionBar({ open, count, variant, onDelete, onClear, actions, start, end }: SelectionBarProps) {
	const actionButtons = renderActions(actions)
	const hasActions = Boolean(onDelete) || actionButtons !== null || start !== undefined || end !== undefined

	if (variant === ActionBarVariant.Inline) {
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
					{start}

					{onDelete && (
						<Button
							variant='destructive'
							size='sm'
							onClick={onDelete}
						>
							Delete
						</Button>
					)}

					{actionButtons}

					{end}

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
		// Zero-height sticky anchor. `sticky` stays in flow, so a bar sized inside it would
		// reserve its own height under the grid permanently (and, if it only mounted on
		// selection, would shift everything below it the moment a row is picked). The wrapper
		// contributes 0px and the bar is positioned absolutely out of it, overlaying the last
		// rows — hence the opaque `bg-card` + border + shadow.
		<div
			data-slot='selection-bar-anchor'
			className='sticky bottom-2 z-10 h-0'
		>
			<div
				role='toolbar'
				aria-orientation='horizontal'
				data-slot='selection-bar'
				data-variant='floating'
				data-state={open ? 'open' : 'closed'}
				className={cn(
					'absolute inset-x-0 bottom-0 mx-auto w-fit',
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

				{start}

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

				{/* Custom actions — `selection.bar.actions`, rendered by this kit */}
				{actionButtons}

				{end}

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
		</div>
	)
}
