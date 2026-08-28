'use client'

import { ActionBarVariant } from '@ez-kit/data-grid-react'
import { Check, RotateCcw } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { cn } from '@grid-shadcn/lib/utils'

import type { DraftBarProps } from '@ez-kit/data-grid-react'

/** Wording for each deferred axis, singular and plural. */
const AXIS_LABELS = {
	sorting: ['sort', 'sorts'],
	filters: ['filter', 'filters'],
} as const

const SEARCH_LABEL = 'search'

type PendingPart = { axis: string; label: string }

/**
 * Turns the pending counts into the segments the bar lists, in the order a user reads
 * their query: sorting, filters, then search. Empty axes are dropped rather than
 * rendered as a zero — a "0 filters" pill is noise, not information.
 */
function pendingParts(pending: DraftBarProps['pending']): PendingPart[] {
	const parts: PendingPart[] = []

	for (const axis of ['sorting', 'filters'] as const) {
		const count = pending[axis]
		if (count <= 0) continue
		const [one, many] = AXIS_LABELS[axis]
		parts.push({ axis, label: `${String(count)} ${count === 1 ? one : many}` })
	}

	if (pending.search) parts.push({ axis: 'search', label: SEARCH_LABEL })

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
	if (!open) return null

	const parts = pendingParts(pending)

	const content = (
		<>
			{selectedCount > 0 && (
				<>
					<span
						data-slot='draft-bar-selected-chip'
						className='flex items-center gap-1 rounded-sm border px-2 py-1 font-medium text-muted-foreground text-sm tabular-nums'
					>
						{selectedCount} selected
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
				<span className='font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider'>Unapplied</span>

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
					Reset
				</Button>

				<Button
					variant='default'
					size='sm'
					data-slot='draft-bar-apply'
					onClick={onApply}
				>
					<Check />
					Apply
				</Button>
			</div>
		</>
	)

	if (variant === ActionBarVariant.Inline) {
		return (
			<div
				role='toolbar'
				aria-orientation='horizontal'
				aria-label='Pending changes'
				data-testid='draft-bar'
				data-slot='draft-bar'
				data-variant='inline'
				data-state='open'
				data-pending-sorting={String(pending.sorting)}
				data-pending-filters={String(pending.filters)}
				data-pending-search={pending.search ? 'true' : 'false'}
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
				aria-label='Pending changes'
				data-testid='draft-bar'
				data-slot='draft-bar'
				data-variant='floating'
				data-state='open'
				data-pending-sorting={String(pending.sorting)}
				data-pending-filters={String(pending.filters)}
				data-pending-search={pending.search ? 'true' : 'false'}
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
