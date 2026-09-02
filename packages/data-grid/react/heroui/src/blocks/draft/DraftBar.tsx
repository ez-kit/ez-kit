'use client'

import { ActionBarVariant } from '@ez-kit/data-grid-react'
import { Button } from '@heroui/react'
import { Check, RotateCcw } from 'lucide-react'

import {
	ActionBar,
	ActionBarGroup,
	ActionBarItem,
	ActionBarSelection,
	ActionBarSeparator,
} from '../../components/ui/action-bar'

import type { DraftBarProps } from '@ez-kit/data-grid-react'

/** Wording for each deferred axis, singular and plural. */
const AXIS_LABELS = {
	sorting: ['sort', 'sorts'],
	columnFilters: ['filter', 'filters'],
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

	for (const axis of ['sorting', 'columnFilters'] as const) {
		const count = pending[axis]
		if (count <= 0) continue
		const [one, many] = AXIS_LABELS[axis]
		parts.push({ axis, label: `${String(count)} ${count === 1 ? one : many}` })
	}

	// Only ever 0 or 1 — a single value, so it lists as a bare word rather than "1 search".
	if (pending.globalFilter > 0) parts.push({ axis: 'globalFilter', label: SEARCH_LABEL })

	return parts
}

/**
 * `ActionBarItem` treats a press as "dismiss the bar" unless the select event is cancelled.
 * Neither draft action wants that: `open` is derived from whether a draft is still pending, so
 * the bar unmounts on its own once `onApply`/`onReset` land. Without this, pressing **Apply**
 * would also run the bar's close handler — i.e. reset the draft it just applied.
 */
function keepBarMounted(event: Event) {
	event.preventDefault()
}

/**
 * Pending-draft section of the shared action bar (HeroUI flavour).
 *
 * Built on the same `ActionBar` primitive as `SelectionBar`, so the two are identical in
 * height, padding, surface and elevation — they are the *same* bar, and only one of them is
 * ever mounted. What changes is the content, not the furniture. The root `data-slot` is
 * `draft-bar` rather than `action-bar`; `global.css` gives it the same entrance animation.
 *
 * While a draft is pending the selection stands down to a non-interactive count chip:
 * applying a query can drop the selected rows out of the result set, so any bulk action
 * over that selection would act on a stale set. The count stays visible as context only.
 *
 * `variant` is the same value this kit's `SelectionBar` receives — one bar, one shape — so an
 * inline selection panel gets an in-flow draft bar (the `ActionBar` floating overlay is skipped
 * entirely) and a floating one gets the sticky overlay.
 *
 * `Apply` is the only primary button in the bar; `Reset` is secondary and also what the
 * bar's Escape handler runs — discarding the draft is the only way this bar can "close".
 */
export function DraftBar({ open, pending, selectedCount, variant, onApply, onReset }: DraftBarProps) {
	const parts = pendingParts(pending)

	const pendingSummary = (
		<div
			data-slot='draft-bar-pending'
			className='flex items-center gap-1.5 px-1'
		>
			<span className='dg-draft-bar-label font-medium text-[0.6875rem] uppercase tracking-wider'>Unapplied</span>

			{parts.map((part) => (
				<span
					key={part.axis}
					data-slot='draft-bar-pending-part'
					data-axis={part.axis}
					className='dg-draft-pill rounded-md px-1.5 py-0.5 text-xs tabular-nums'
				>
					{part.label}
				</span>
			))}
		</div>
	)

	if (variant === ActionBarVariant.Inline) {
		if (!open) return null

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
				data-pending-column-filters={String(pending.columnFilters)}
				data-pending-global-filter={String(pending.globalFilter)}
				data-selected-count={String(selectedCount)}
				className='mb-2 flex w-full flex-row items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-surface-secondary-foreground text-sm'
			>
				{selectedCount > 0 && (
					<span
						data-slot='draft-bar-selected-chip'
						className='dg-draft-bar-label font-medium tabular-nums'
					>
						{selectedCount} selected
					</span>
				)}

				{pendingSummary}

				<div className='ml-auto flex items-center gap-2'>
					<Button
						size='sm'
						variant='ghost'
						data-slot='draft-bar-reset'
						onPress={onReset}
					>
						<RotateCcw size={16} />
						Reset
					</Button>
					<Button
						size='sm'
						variant='primary'
						data-slot='draft-bar-apply'
						onPress={onApply}
					>
						<Check size={16} />
						Apply
					</Button>
				</div>
			</div>
		)
	}

	return (
		<ActionBar
			open={open}
			onOpenChange={(next) => {
				if (!next) onReset()
			}}
			side='bottom'
			align='center'
			sideOffset={16}
			aria-label='Pending changes'
			data-testid='draft-bar'
			data-slot='draft-bar'
			data-variant='floating'
			data-pending-sorting={String(pending.sorting)}
			data-pending-column-filters={String(pending.columnFilters)}
			data-pending-global-filter={String(pending.globalFilter)}
			data-selected-count={String(selectedCount)}
		>
			<ActionBarGroup>
				{selectedCount > 0 && (
					<>
						<ActionBarSelection
							data-slot='draft-bar-selected-chip'
							className='text-muted'
						>
							{selectedCount} selected
						</ActionBarSelection>
						<ActionBarSeparator />
					</>
				)}

				{pendingSummary}

				<ActionBarItem
					variant='ghost'
					data-slot='draft-bar-reset'
					onSelect={keepBarMounted}
					onPress={onReset}
				>
					<RotateCcw size={16} />
					Reset
				</ActionBarItem>

				<ActionBarItem
					variant='primary'
					data-slot='draft-bar-apply'
					onSelect={keepBarMounted}
					onPress={onApply}
				>
					<Check size={16} />
					Apply
				</ActionBarItem>
			</ActionBarGroup>
		</ActionBar>
	)
}
