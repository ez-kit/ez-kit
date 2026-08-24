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
 * Pending-draft section of the shared action bar (unstyled/native flavour).
 *
 * Chrome matches this kit's `SelectionBar` exactly — same flex row, gap, padding and hairline
 * border — because the two are the *same* bar and only one of them is ever mounted. What
 * changes is the content, not the furniture.
 *
 * While a draft is pending the selection stands down to a non-interactive count chip: applying
 * a query can drop the selected rows out of the result set, so a bulk action over that
 * selection would act on a stale set. The count stays as context only.
 *
 * `Apply` is the only emphasised button in the bar; the pending segments and `Reset` are drawn
 * with the dashed, muted "not yet real" treatment `global.css` also gives drafted headers and
 * filter chips.
 */
export function DraftBar({ open, pending, selectedCount, onApply, onReset }: DraftBarProps) {
	if (!open) return null

	const parts = pendingParts(pending)

	return (
		<div
			role='toolbar'
			aria-label='Pending changes'
			data-testid='draft-bar'
			data-slot='draft-bar'
			data-pending-sorting={String(pending.sorting)}
			data-pending-filters={String(pending.filters)}
			data-pending-search={pending.search ? 'true' : 'false'}
			data-selected-count={String(selectedCount)}
			style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}
		>
			{selectedCount > 0 && (
				<>
					<span data-slot='draft-bar-selected-chip'>{selectedCount} selected</span>
					<span
						role='separator'
						aria-orientation='vertical'
						aria-hidden='true'
						style={{ width: 1, alignSelf: 'stretch', background: '#ccc' }}
					/>
				</>
			)}

			<span data-slot='draft-bar-pending'>
				<span data-slot='draft-bar-label'>Unapplied</span>
				{parts.map((part) => (
					<span
						key={part.axis}
						data-slot='draft-bar-pending-part'
						data-axis={part.axis}
					>
						{part.label}
					</span>
				))}
			</span>

			<button
				type='button'
				data-slot='draft-bar-reset'
				onClick={onReset}
			>
				Reset
			</button>

			<button
				type='button'
				data-slot='draft-bar-apply'
				onClick={onApply}
			>
				Apply
			</button>
		</div>
	)
}
