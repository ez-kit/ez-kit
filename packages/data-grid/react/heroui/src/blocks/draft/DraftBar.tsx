'use client'

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
 * `Apply` is the only primary button in the bar; `Reset` is secondary and also what the
 * bar's Escape handler runs — discarding the draft is the only way this bar can "close".
 */
export function DraftBar({ open, pending, selectedCount, onApply, onReset }: DraftBarProps) {
	const parts = pendingParts(pending)

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
			data-pending-sorting={String(pending.sorting)}
			data-pending-filters={String(pending.filters)}
			data-pending-search={pending.search ? 'true' : 'false'}
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
