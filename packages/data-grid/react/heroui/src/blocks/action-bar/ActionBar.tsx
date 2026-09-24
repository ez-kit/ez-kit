'use client'

import { ActionBarVariant, isGridMenuItemSlot, useGridComponents, useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button, Chip } from '@heroui/react'
import { ArrowDownUp, Check, Filter, RotateCcw, Search, Trash2, X } from 'lucide-react'
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

/**
 * One pending axis, in both forms the bar needs: the glyph and number it shows, and the worded
 * segment it puts in the section's accessible name and its tooltip.
 */
type PendingPart = {
	axis: string
	/** The long form — `2 sorts`, from the dictionary. */
	label: string
	/** The short form's glyph. This kit's own choice, like every other icon it draws. */
	icon: ReactNode
	/** The short form's number, absent where there is nothing to count. */
	count?: number
}

/** Matches the other glyphs this bar draws at `size={16}`, one step down for a pill. */
const PART_ICON_SIZE = 12

/**
 * Turns the pending counts into the segments the draft section lists, in the order a user reads
 * their query: sorting, filters, then search. Empty axes are dropped rather than rendered as a
 * zero — a "0 filters" pill is noise, not information.
 */
function pendingParts(pending: ActionBarDraftSection['pending'], messages: GridMessages['draft']): PendingPart[] {
	const parts: PendingPart[] = []

	// The wording — including the plural rule, which is the language's and not the grid's —
	// comes from the dictionary entry for each axis.
	if (pending.sorting > 0) {
		parts.push({
			axis: 'sorting',
			label: messages.sorts({ count: pending.sorting }),
			icon: <ArrowDownUp size={PART_ICON_SIZE} />,
			count: pending.sorting,
		})
	}
	if (pending.columnFilters > 0) {
		parts.push({
			axis: 'columnFilters',
			label: messages.filters({ count: pending.columnFilters }),
			icon: <Filter size={PART_ICON_SIZE} />,
			count: pending.columnFilters,
		})
	}

	// Only ever 0 or 1, so the short form is the glyph alone and the long form a bare word
	// rather than "1 search" — a count here would say nothing the glyph does not.
	if (pending.globalFilter > 0) {
		parts.push({ axis: 'globalFilter', label: messages.search, icon: <Search size={PART_ICON_SIZE} /> })
	}

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
					data-slot='action-bar-selection-count'
					aria-label={messages.selection.count({ count })}
					className='font-medium tabular-nums'
				>
					{count}
				</span>
			) : (
				/*
				 * The slot goes on a wrapper rather than on the `Chip`, because `Chip` spreads the
				 * caller's props and *then* writes its own `data-slot='chip'` over them — the grid's
				 * name never reaches the DOM. Note `Chip.Label` spreads props *after* its own
				 * `data-slot`, so it would keep the name; the asymmetry is upstream's and is not
				 * something to rely on, which is why this wrapper exists rather than being
				 * "simplified" into a slot on either element. The shadcn kit stamps it on its count
				 * directly, and a selector has to find the number in both kits: `e2e-slots.test.ts`
				 * only asks whether *some* package authors a slot, so a spec addressing this one
				 * would pass against shadcn and match nothing here.
				 */
				<span
					data-slot='action-bar-selection-count'
					aria-label={messages.selection.count({ count })}
				>
					<Chip className='tabular-nums'>{count}</Chip>
				</span>
			)}
			{hasActions && <BarSeparator inline={inline} />}
			{start}
			{onDelete && renderDelete(onDelete)}
			{actionButtons}
			{end}
			{/* Always present: it divides the count (and any actions) from the close button. */}
			<BarSeparator inline={inline} />
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
	// `FullGridComponents` types every group as present, but the context's default registry is
	// an empty object wearing that type — so a bar rendered outside a provider (this kit's own
	// unit tests, most obviously) would destructure `undefined` and crash on a decoration.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- see above
	const Tooltip = useGridComponents().core?.Tooltip
	const parts = pendingParts(draft.pending, messages.draft)

	// The long form, and the only place the axes are named in words. `pending` covers the case
	// the bar cannot enumerate: `draft.isDirty()` is what mounts this section, and a dirty draft
	// with every pending count at zero would otherwise be labelled with an empty list.
	const summary =
		parts.length > 0
			? messages.draft.summary({ label: messages.draft.label, parts: parts.map((part) => part.label) })
			: messages.draft.pending

	// The short form: the label, then a glyph and a number per axis. It shares the bar with the
	// selection section, so it says as little as fits and hands the rest to `summary` — which is
	// both this element's tooltip and the section's accessible name, so a reader who cannot
	// hover is not the one paying for the brevity.
	const shortForm = (
		<div className='flex items-center gap-1.5 px-1'>
			<span className='dg-draft-label font-medium text-[0.6875rem] uppercase tracking-wider'>
				{messages.draft.label}
			</span>

			{parts.map((part) => (
				<span
					key={part.axis}
					data-slot='action-bar-draft-part'
					data-axis={part.axis}
					aria-hidden='true'
					className='dg-draft-pill flex items-center gap-0.5 rounded-md px-1 py-0.5 text-xs tabular-nums'
				>
					{part.icon}
					{part.count}
				</span>
			))}
		</div>
	)

	return (
		// `role='group'`: `aria-label` on a bare `div` is not exposed, so the name the draft
		// section carries has to sit on an element that has a role to name.
		<div
			role='group'
			data-slot='action-bar-draft'
			aria-label={summary}
			className='flex flex-row items-center gap-2'
		>
			{/* Optional slot: a kit that registers no tooltip shows the short form alone, and the
			    summary is still on the section above. */}
			{Tooltip ? <Tooltip content={summary}>{shortForm}</Tooltip> : shortForm}

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
 * [2] ┃ [Delete] [actions] [×]  ┃  UNAPPLIED [⇅2] [▽1]  [Reset] [✓ Apply]
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

	// Escape (and the primitive's own close path) clears the selection when there is one to
	// clear, and otherwise discards the draft. Deliberately not both: dismissing a selection
	// must not throw away unapplied query work, so with both sections up the bar stays — with
	// its draft half.
	//
	// The test is `count > 0`, not `selection !== undefined`: the section is built from
	// `selection.bar` being configured, which says nothing about whether any row is picked. On
	// the presence test, Escape over an empty selection beside a dirty draft ran
	// `resetRowSelection()` on nothing and left the draft standing.
	const onClose = () => {
		if (selection !== undefined && selection.count > 0) {
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

	// While the bar closes there is, by definition, nothing to act on — but the chrome stays so
	// the floating variant can animate out with its last count. Beside a pending draft a zero
	// count is not that case: it would put an empty chip and a Delete button next to the draft.
	const showSelection = selection !== undefined && (selection.count > 0 || draft === undefined)

	const sections = (
		<>
			{showSelection && (
				<SelectionSection
					selection={selection}
					inline={isInline}
				/>
			)}
			{/* The floating bar is `w-fit`, so the two sections sit shoulder to shoulder and need a
			    rule between them. The inline strip is full width and pushes them to its two ends
			    (`justify-between`), where a rule would strand itself in the gap rather than divide
			    anything — the distance already does the dividing. */}
			{!isInline && showSelection && draft && <BarSeparator inline={isInline} />}
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
