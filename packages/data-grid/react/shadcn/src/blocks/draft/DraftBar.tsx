'use client'

import { ActionBarVariant, useGridMessages } from '@ez-kit/data-grid-react'
import { Check, RotateCcw } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { cn } from '@grid-shadcn/lib/utils'

import type { DraftBarProps, GridMessages } from '@ez-kit/data-grid-react'

type PendingPart = { axis: string; label: string }

/**
 * Turns the pending counts into the segments the bar lists, in the order a user reads
 * their query: sorting, filters, then search. Empty axes are dropped rather than
 * rendered as a zero — a "0 filters" pill is noise, not information.
 */
function pendingParts(pending: DraftBarProps['pending'], messages: GridMessages['draft']): PendingPart[] {
	const parts: PendingPart[] = []

	// The wording — including the plural rule, which is the language's and not the grid's —
	// comes from the dictionary entry for each axis.
	if (pending.sorting > 0) parts.push({ axis: 'sorting', label: messages.sorts({ count: pending.sorting }) })
	if (pending.columnFilters > 0) {
		parts.push({ axis: 'columnFilters', label: messages.filters({ count: pending.columnFilters }) })
	}

	// Only ever 0 or 1 — a single value, so it lists as a bare word rather than "1 search".
	if (pending.globalFilter > 0) parts.push({ axis: 'globalFilter', label: messages.search })

	return parts
}

/**
 * Pending-draft section of the shared action bar (shadcn flavour).
 *
 * Chrome is deliberately identical to the floating `SelectionBar` — same anchor, surface,
 * radius, padding and elevation — because the two are the *same* bar: only one of them is
 * ever mounted. What changes is the content, not the furniture.
 *
 * While a draft is pending the selection stands down to a non-interactive count chip:
 * applying a query can drop the selected rows out of the result set, so any bulk action
 * over that selection would act on a stale set. The count stays visible as context only.
 *
 * `variant` is the same value the kit's `SelectionBar` receives — one bar, one shape — so an
 * inline selection panel gets an inline draft bar and a floating one gets the sticky overlay.
 *
 * `Apply` is the only primary button in the bar; `Reset` is secondary. The pending
 * segments are drawn with the same dashed, muted treatment as an unapplied filter chip,
 * so "not yet real" reads the same wherever it appears in the grid.
 */
export function DraftBar({ open, pending, selectedCount, variant, onApply, onReset }: DraftBarProps) {
	const messages = useGridMessages()
	if (!open) return null

	const parts = pendingParts(pending, messages.draft)

	const content = (
		<>
			{selectedCount > 0 && (
				<>
					<span
						data-slot='draft-bar-selected-chip'
						className='flex items-center gap-1 rounded-sm border px-2 py-1 font-medium text-muted-foreground text-sm tabular-nums'
					>
						{messages.selection.count({ count: selectedCount })}
					</span>

					<div
						role='separator'
						aria-orientation='vertical'
						aria-hidden='true'
						className='h-6 w-px bg-border'
					/>
				</>
			)}

			<div
				data-slot='draft-bar-pending'
				className='flex items-center gap-1.5 pr-1 pl-1 text-sm'
			>
				<span className='font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider'>
					{messages.draft.label}
				</span>

				{parts.map((part) => (
					<span
						key={part.axis}
						data-slot='draft-bar-pending-part'
						data-axis={part.axis}
						className='rounded-sm border border-dashed px-1.5 py-0.5 text-muted-foreground text-xs tabular-nums'
					>
						{part.label}
					</span>
				))}
			</div>

			<div className={cn('flex items-center gap-2', variant === ActionBarVariant.Inline && 'ml-auto')}>
				<Button
					variant='ghost'
					size='sm'
					data-slot='draft-bar-reset'
					onClick={onReset}
				>
					<RotateCcw />
					{messages.draft.reset}
				</Button>

				<Button
					variant='default'
					size='sm'
					data-slot='draft-bar-apply'
					onClick={onApply}
				>
					<Check />
					{messages.draft.apply}
				</Button>
			</div>
		</>
	)

	if (variant === ActionBarVariant.Inline) {
		return (
			<div
				role='toolbar'
				aria-orientation='horizontal'
				aria-label={messages.draft.pending}
				data-testid='draft-bar'
				data-slot='draft-bar'
				data-variant='inline'
				data-state='open'
				data-pending-sorting={String(pending.sorting)}
				data-pending-column-filters={String(pending.columnFilters)}
				data-pending-global-filter={String(pending.globalFilter)}
				data-selected-count={String(selectedCount)}
				className='mb-2 flex w-full flex-row items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm'
			>
				{content}
			</div>
		)
	}

	return (
		// Zero-height sticky anchor, mirroring `SelectionBar` — see the note there for why
		// the bar is positioned out of a 0px wrapper instead of sitting in flow.
		<div
			data-slot='draft-bar-anchor'
			className='sticky bottom-2 z-10 h-0'
		>
			<div
				role='toolbar'
				aria-orientation='horizontal'
				aria-label={messages.draft.pending}
				data-testid='draft-bar'
				data-slot='draft-bar'
				data-variant='floating'
				data-state='open'
				data-pending-sorting={String(pending.sorting)}
				data-pending-column-filters={String(pending.columnFilters)}
				data-pending-global-filter={String(pending.globalFilter)}
				data-selected-count={String(selectedCount)}
				className={cn(
					'absolute inset-x-0 bottom-0 mx-auto w-fit',
					'flex flex-row items-center gap-2 rounded-lg border bg-card px-2 py-1.5 shadow-lg',
					'animate-in fade-in-0 slide-in-from-bottom-4',
					'transition-all duration-250 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]',
				)}
			>
				{content}
			</div>
		</div>
	)
}
