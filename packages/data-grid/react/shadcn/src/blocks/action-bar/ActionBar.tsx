'use client'

import { ActionBarVariant, isGridMenuItemSlot, useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Check, RotateCcw, X } from 'lucide-react'
import { Fragment } from 'react'

import { Button } from '@grid-shadcn/components/ui/button'
import { cn } from '@grid-shadcn/lib/utils'

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

type PendingPart = { axis: string; label: string }

/** The thin rule between two groups of controls. Vertical in a horizontal bar. */
function Separator() {
	return (
		<div
			role='separator'
			aria-orientation='vertical'
			aria-hidden='true'
			data-slot='action-bar-separator'
			className='h-6 w-px shrink-0 bg-border'
		/>
	)
}

/**
 * One `selection.bar.actions` entry as a button, matching the built-in Delete beside it: the
 * kit's glyph for a named icon, its danger colour for a destructive entry, its disabled state.
 * This is what the config buys over hand-drawn markup.
 */
function ActionButton({ item }: { item: GridMenuItemDef }) {
	const icon = renderActionIcon(item.icon)

	return (
		<Button
			variant={item.destructive === true ? 'destructive' : 'outline'}
			size='sm'
			disabled={item.disabled === true}
			data-slot='action-bar-action'
			{...(item.className !== undefined ? { className: item.className } : {})}
			onClick={item.onAction}
		>
			{icon}
			{item.label}
		</Button>
	)
}

/** The entries as buttons — `null` when the bar was given none, so separators can tell. */
function renderActions(actions: GridMenuItem[] | undefined): ReactNode {
	if (actions === undefined || actions.length === 0) return null
	return actions.map((item) =>
		// An entry that brought its own markup stands where its button would have been — the bar
		// is plain flex, so it needs no wrapper of ours.
		isGridMenuItemSlot(item) ? (
			<Fragment key={item.id}>{item.component}</Fragment>
		) : (
			<ActionButton
				key={item.id}
				item={item}
			/>
		),
	)
}

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

/** What is selected and what can be done to it — the start side of the bar. */
function SelectionSection({ selection }: { selection: ActionBarSelectionSection }) {
	const messages = useGridMessages()
	const actionButtons = renderActions(selection.actions)
	const hasActions =
		selection.onDelete !== undefined ||
		actionButtons !== null ||
		selection.start !== undefined ||
		selection.end !== undefined

	return (
		<div
			data-slot='action-bar-selection'
			className='flex flex-row items-center gap-2'
		>
			<span
				data-slot='action-bar-selection-count'
				aria-label={messages.selection.count({ count: selection.count })}
				className='flex items-center gap-1 rounded-sm border px-2 py-1 font-medium text-sm tabular-nums'
			>
				{selection.count}
			</span>

			{/* Only when there are action buttons to divide from the count */}
			{hasActions && <Separator />}

			{selection.start}

			{/* Delete — only when `deleting.bulk` is on */}
			{selection.onDelete && (
				<Button
					variant='destructive'
					size='sm'
					onClick={selection.onDelete}
				>
					{messages.selection.delete}
				</Button>
			)}

			{/* Custom actions — `selection.bar.actions`, rendered by this kit */}
			{actionButtons}

			{selection.end}

			<Separator />

			{/*
			 * The `×` clears the selection, so it belongs to this section and sits beside what it
			 * clears rather than at the bar's end, where it would read as dismissing the draft too.
			 */}
			<Button
				variant='ghost'
				size='icon'
				data-slot='action-bar-close'
				onClick={selection.onClear}
				aria-label={messages.selection.clear}
			>
				<X />
			</Button>
		</div>
	)
}

/** What is unapplied and the two ways out of it — the end side of the bar. */
function DraftSection({ draft }: { draft: ActionBarDraftSection }) {
	const messages = useGridMessages()
	const parts = pendingParts(draft.pending, messages.draft)

	return (
		<div
			data-slot='action-bar-draft'
			className='flex flex-row items-center gap-2'
		>
			<div className='flex items-center gap-1.5 pr-1 pl-1 text-sm'>
				<span className='font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider'>
					{messages.draft.label}
				</span>

				{parts.map((part) => (
					<span
						key={part.axis}
						data-slot='action-bar-draft-part'
						data-axis={part.axis}
						className='rounded-sm border border-dashed px-1.5 py-0.5 text-muted-foreground text-xs tabular-nums'
					>
						{part.label}
					</span>
				))}
			</div>

			<Button
				variant='ghost'
				size='sm'
				data-slot='action-bar-reset'
				onClick={draft.onReset}
			>
				<RotateCcw />
				{messages.draft.reset}
			</Button>

			{/* The bar's only primary, and its last control — where a primary action is looked for. */}
			<Button
				variant='default'
				size='sm'
				data-slot='action-bar-apply'
				onClick={draft.onApply}
			>
				<Check />
				{messages.draft.apply}
			</Button>
		</div>
	)
}

/**
 * The grid's one action bar (shadcn flavour) — one surface, one set of chrome, and a live
 * section per concern:
 *
 * ```
 * [2] ┃ [Delete] [actions] [×]  ┃  DRAFT [2 sorts] [1 filter]  [Reset] [✓ Apply]
 * ```
 *
 * Selection on the start side, draft on the end side, so `Apply` — the bar's only primary —
 * lands at the far end. This replaces two components (`SelectionBar` and `DraftBar`) that each
 * drew a whole bar and were kept apart by a gate that only re-ran on a selection change; a draft
 * edit changes no selection, so they overlapped. Both sections are live at once: the selection is
 * valid against the **applied** query, and `table.draft.apply()` clears it in the same state
 * change that could make it stale.
 *
 * **Not built on `components/ui/action-bar.tsx`, deliberately.** That primitive's root portals
 * into `document.body`, positions itself `fixed` against the viewport and returns `null` while
 * closed. All three fight this bar's requirements: `inline` is an in-flow strip (no portal, no
 * fixed positioning), `floating` overlays the grid's own last rows out of a zero-height sticky
 * anchor rather than the viewport, and `open: false` has to keep rendering so the floating bar
 * can animate out — which is the whole reason `open` is a prop independent of the sections. The
 * design permits this fallback explicitly: what it requires is the section split and the single
 * surface, not a particular primitive.
 */
export function ActionBar({ open, variant, selection, draft }: ActionBarProps) {
	const messages = useGridMessages()

	// While the bar closes there is, by definition, nothing to act on — but the chrome stays so
	// the floating variant can animate out with its last count. Beside a pending draft a zero
	// count is not that case: it would put an empty chip and a Delete button next to the draft.
	const showSelection = selection !== undefined && (selection.count > 0 || draft === undefined)
	const showDraft = draft !== undefined

	const pendingAttributes =
		draft !== undefined
			? {
					'data-pending-sorting': String(draft.pending.sorting),
					'data-pending-column-filters': String(draft.pending.columnFilters),
					'data-pending-global-filter': String(draft.pending.globalFilter),
				}
			: {}

	const barAttributes = {
		role: 'toolbar' as const,
		'aria-orientation': 'horizontal' as const,
		...(showDraft ? { 'aria-label': messages.draft.pending } : {}),
		'data-slot': 'action-bar',
		'data-testid': 'action-bar',
		'data-selected-count': String(selection?.count ?? 0),
		...pendingAttributes,
	}

	const content = (
		<>
			{showSelection && <SelectionSection selection={selection} />}
			{showSelection && showDraft && <Separator />}
			{/* `ml-auto` under `inline`: the strip is full-width, so the draft has to be pushed
			    to the end the floating bar's `w-fit` gives it for free. */}
			{showDraft && (
				<div className={cn('flex items-center', variant === ActionBarVariant.Inline && 'ml-auto')}>
					<DraftSection draft={draft} />
				</div>
			)}
		</>
	)

	if (variant === ActionBarVariant.Inline) {
		// An in-flow strip reserves height, so it unmounts rather than animating out.
		if (!open) return null

		return (
			<div
				{...barAttributes}
				data-variant='inline'
				data-state='open'
				className='mb-2 flex w-full flex-row items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm'
			>
				{content}
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
			data-slot='action-bar-anchor'
			className='sticky bottom-2 z-10 h-0'
		>
			<div
				{...barAttributes}
				data-variant='floating'
				data-state={open ? 'open' : 'closed'}
				className={cn(
					'absolute inset-x-0 bottom-0 mx-auto w-fit',
					'flex flex-row items-center gap-2 rounded-lg border bg-card px-2 py-1.5 shadow-lg',
					'transition-all duration-250 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]',
					open ? 'animate-in fade-in-0 slide-in-from-bottom-4' : 'pointer-events-none translate-y-4 opacity-0',
				)}
			>
				{content}
			</div>
		</div>
	)
}
