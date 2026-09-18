'use client'

import { ActionBarVariant, isGridMenuItemSlot, useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button, Chip } from '@heroui/react'
import { Check, RotateCcw, Trash2, X } from 'lucide-react'
import { Fragment } from 'react'

import {
	ActionBar as ActionBarRoot,
	ActionBarGroup,
	ActionBarItem,
	ActionBarSeparator,
} from '../../components/ui/action-bar'
import { renderActionIcon } from '../icons'

import type {
	ActionBarDraftSection,
	ActionBarProps,
	ActionBarSelectionSection,
	GridMenuItem,
	GridMenuItemDef,
	GridMessages,
} from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

/**
 * The primitive dismisses the bar after an item press, the way a menu closes behind a chosen
 * entry. Here "dismissed" means `onOpenChange(false)`, which clears the selection — pulling the
 * rows out from under the action that was just pressed: a bulk delete awaiting its confirmation
 * dialog then had nothing left to delete. On the draft side it is worse: pressing **Apply**
 * would also run the close handler, i.e. discard the draft it just applied. Cancelling the
 * select event keeps the bar alive; the × is the only thing that clears the selection.
 */
const keepBarOpen = (event: Event) => {
	event.preventDefault()
}

/**
 * The bar's divider. The `ActionBarSeparator` primitive reads the root's context, which only the
 * floating variant provides, so the inline strip draws the same rule itself — same slot, same
 * look, no context.
 */
function BarSeparator({ inline }: { inline: boolean }) {
	if (!inline) return <ActionBarSeparator />

	return (
		<div
			role='separator'
			aria-orientation='horizontal'
			aria-hidden='true'
			data-slot='action-bar-separator'
			className='h-6 w-px shrink-0 bg-separator'
		/>
	)
}

type PendingPart = { axis: string; label: string }

/**
 * Turns the pending counts into the segments the draft section lists, in the order a user reads
 * their query: sorting, filters, then search. Empty axes are dropped rather than rendered as a
 * zero — a "0 filters" pill is noise, not information.
 */
function pendingParts(pending: ActionBarDraftSection['pending'], messages: GridMessages['draft']): PendingPart[] {
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
 * One `selection.bar.actions` entry as a button, matching the built-in Delete beside it: the
 * kit's glyph for a named icon, its danger colour for a destructive entry, its disabled state.
 * This is what the config buys over hand-drawn markup.
 *
 * The floating bar renders its controls as `ActionBarItem`s and the inline one as plain
 * `Button`s, so the element is passed in rather than picked here.
 */
function ActionButton({ item, inline }: { item: GridMenuItemDef; inline: boolean }) {
	const icon = renderActionIcon(item.icon)
	const variant = item.destructive === true ? 'danger' : 'secondary'
	const isDisabled = item.disabled === true

	if (inline) {
		return (
			<Button
				size='sm'
				variant={variant}
				isDisabled={isDisabled}
				data-slot='action-bar-action'
				{...(item.className !== undefined ? { className: item.className } : {})}
				onPress={item.onAction}
			>
				{icon}
				{item.label}
			</Button>
		)
	}

	return (
		<ActionBarItem
			variant={variant}
			isDisabled={isDisabled}
			data-slot='action-bar-action'
			{...(item.className !== undefined ? { className: item.className } : {})}
			onSelect={keepBarOpen}
			onPress={item.onAction}
		>
			{icon}
			{item.label}
		</ActionBarItem>
	)
}

/** The entries as buttons — `null` when the bar was given none, so separators can tell. */
function renderActions(actions: GridMenuItem[] | undefined, inline: boolean): ReactNode {
	if (actions === undefined || actions.length === 0) return null
	return actions.map((item) =>
		// An entry that brought its own markup stands where its button would have been. Both
		// sections already take arbitrary nodes here — `start` / `end` sit in the same row.
		isGridMenuItemSlot(item) ? (
			<Fragment key={item.id}>{item.component}</Fragment>
		) : (
			<ActionButton
				key={item.id}
				item={item}
				inline={inline}
			/>
		),
	)
}

/**
 * The selection half: the count, then what can be done to it, then the ×.
 *
 * The × belongs to this section and therefore sits mid-bar, beside what it clears, rather than
 * at the bar's end where it would read as dismissing the draft too.
 */
function SelectionSection({ selection, inline }: { selection: ActionBarSelectionSection; inline: boolean }) {
	const messages = useGridMessages()
	const { count, onClear, onDelete, actions, start, end } = selection
	const actionButtons = renderActions(actions, inline)
	const hasActions = Boolean(onDelete) || actionButtons !== null || start !== undefined || end !== undefined

	const renderDelete = (handler: () => void) =>
		inline ? (
			<Button
				size='sm'
				variant='danger'
				onPress={handler}
			>
				<Trash2 size={16} />
				{messages.selection.delete}
			</Button>
		) : (
			<ActionBarItem
				variant='danger'
				onSelect={keepBarOpen}
				onPress={handler}
			>
				<Trash2 size={16} />
				{messages.selection.delete}
			</ActionBarItem>
		)

	return (
		<div
			data-slot='action-bar-selection'
			className='flex flex-row items-center gap-2'
		>
			{inline ? (
				<span
					aria-label={messages.selection.count({ count })}
					className='font-medium tabular-nums'
				>
					{count}
				</span>
			) : (
				<Chip
					aria-label={messages.selection.count({ count })}
					className='tabular-nums'
				>
					{count}
				</Chip>
			)}
			{hasActions && <BarSeparator inline={inline} />}
			{start}
			{onDelete && renderDelete(onDelete)}
			{actionButtons}
			{end}
			<Button
				size='sm'
				variant='ghost'
				isIconOnly
				data-slot='action-bar-close'
				aria-label={messages.selection.clear}
				onPress={onClear}
			>
				<X size={16} />
			</Button>
		</div>
	)
}

/**
 * The pending-draft half: what is unapplied, and the two ways out of it.
 *
 * `Apply` is the bar's only primary button and its last control, so it lands at the far end
 * where a primary action is looked for.
 */
function DraftSection({ draft, inline }: { draft: ActionBarDraftSection; inline: boolean }) {
	const messages = useGridMessages()
	const parts = pendingParts(draft.pending, messages.draft)

	return (
		<div
			data-slot='action-bar-draft'
			aria-label={messages.draft.pending}
			className='flex flex-row items-center gap-2'
		>
			<div className='flex items-center gap-1.5 px-1'>
				<span className='dg-draft-label font-medium text-[0.6875rem] uppercase tracking-wider'>
					{messages.draft.label}
				</span>

				{parts.map((part) => (
					<span
						key={part.axis}
						data-slot='action-bar-draft-part'
						data-axis={part.axis}
						className='dg-draft-pill rounded-md px-1.5 py-0.5 text-xs tabular-nums'
					>
						{part.label}
					</span>
				))}
			</div>

			{inline ? (
				<>
					<Button
						size='sm'
						variant='ghost'
						data-slot='action-bar-reset'
						onPress={draft.onReset}
					>
						<RotateCcw size={16} />
						{messages.draft.reset}
					</Button>
					<Button
						size='sm'
						variant='primary'
						data-slot='action-bar-apply'
						onPress={draft.onApply}
					>
						<Check size={16} />
						{messages.draft.apply}
					</Button>
				</>
			) : (
				<>
					<ActionBarItem
						variant='ghost'
						data-slot='action-bar-reset'
						onSelect={keepBarOpen}
						onPress={draft.onReset}
					>
						<RotateCcw size={16} />
						{messages.draft.reset}
					</ActionBarItem>
					<ActionBarItem
						variant='primary'
						data-slot='action-bar-apply'
						onSelect={keepBarOpen}
						onPress={draft.onApply}
					>
						<Check size={16} />
						{messages.draft.apply}
					</ActionBarItem>
				</>
			)}
		</div>
	)
}

/**
 * The grid's one action bar (HeroUI flavour) — one surface, two live sections:
 *
 * ```
 * [2] ┃ [Delete] [actions] [×]  ┃  DRAFT [2 sorts] [1 filter]  [Reset] [✓ Apply]
 * ```
 *
 * Selection on the start side, draft on the end side, one `ActionBarSeparator` between them.
 * This replaces `SelectionBar` + `DraftBar`, which each drew a whole bar and were kept apart by
 * a gate in the selection one that only re-ran when `rowSelection` changed — so a draft edit
 * mounted both at the same sticky position, on top of each other.
 *
 * Both sections are live at once: the selection is valid against the **applied** query, which is
 * what the user is looking at, and the set only goes stale after Apply — which `draft.apply()`
 * already handles by clearing the selection in the same state change.
 *
 * Both variants are kept: `inline` is an in-flow strip, `floating` the sticky overlay the
 * `ActionBar` primitive positions out of a zero-height anchor.
 */
export function ActionBar({ open, variant, selection, draft }: ActionBarProps) {
	const isInline = variant === ActionBarVariant.Inline
	const pending = draft?.pending

	// Escape (and the primitive's own close path) clears the selection when there is one, and
	// otherwise discards the draft. Deliberately not both: dismissing a selection must not throw
	// away unapplied query work, so with both sections up the bar stays — with its draft half.
	const onClose = () => {
		if (selection !== undefined) {
			selection.onClear()
			return
		}
		draft?.onReset()
	}

	const stateAttributes = {
		'data-variant': variant,
		'data-selected-count': String(selection?.count ?? 0),
		...(pending
			? {
					'data-pending-sorting': String(pending.sorting),
					'data-pending-column-filters': String(pending.columnFilters),
					'data-pending-global-filter': String(pending.globalFilter),
				}
			: {}),
	}

	const sections = (
		<>
			{selection && (
				<SelectionSection
					selection={selection}
					inline={isInline}
				/>
			)}
			{selection && draft && <BarSeparator inline={isInline} />}
			{draft && (
				<DraftSection
					draft={draft}
					inline={isInline}
				/>
			)}
		</>
	)

	if (isInline) {
		if (!open) return null

		return (
			<div
				role='toolbar'
				aria-orientation='horizontal'
				data-slot='action-bar'
				data-testid='action-bar'
				data-state='open'
				{...stateAttributes}
				className='mb-2 flex w-full flex-row items-center justify-between gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-surface-secondary-foreground text-sm'
			>
				{sections}
			</div>
		)
	}

	return (
		<ActionBarRoot
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			side='bottom'
			align='center'
			sideOffset={16}
			data-testid='action-bar'
			{...stateAttributes}
		>
			<ActionBarGroup>{sections}</ActionBarGroup>
		</ActionBarRoot>
	)
}
