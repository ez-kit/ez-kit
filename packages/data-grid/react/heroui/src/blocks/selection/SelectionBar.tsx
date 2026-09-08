'use client'

import { ActionBarVariant, isGridMenuItemSlot } from '@ez-kit/data-grid-react'
import { Button, Chip } from '@heroui/react'
import { Trash2, X } from 'lucide-react'
import { Fragment } from 'react'

import { ActionBar, ActionBarGroup, ActionBarItem, ActionBarSeparator } from '../../components/ui/action-bar'
import { renderActionIcon } from '../icons'

import type { GridMenuItem, GridMenuItemDef, SelectionBarProps } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

/**
 * The primitive dismisses the bar after an item press, the way a menu closes behind a chosen
 * entry. Here "dismissed" means `onOpenChange(false)` → clear the selection, which pulls the
 * rows out from under the action that was just pressed: a bulk delete awaiting its confirmation
 * dialog then had nothing left to delete. Cancelling the select event keeps the bar (and the
 * selection) alive; the × is the only thing that clears it.
 */
const keepBarOpen = (event: Event) => {
	event.preventDefault()
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
				data-slot='selection-bar-action'
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
			data-slot='selection-bar-action'
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
		// An entry that brought its own markup stands where its button would have been. Both bars
		// already take arbitrary nodes here — `start` / `end` sit in the same row.
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

export function SelectionBar({ open, count, variant, onDelete, onClear, actions, start, end }: SelectionBarProps) {
	const isInline = variant === ActionBarVariant.Inline
	const actionButtons = renderActions(actions, isInline)
	const hasActions = Boolean(onDelete) || actionButtons !== null || start !== undefined || end !== undefined

	if (isInline) {
		if (!open) return null

		return (
			<div
				role='toolbar'
				aria-orientation='horizontal'
				data-slot='selection-bar'
				data-variant='inline'
				data-state='open'
				className='mb-2 flex w-full flex-row items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-surface-secondary-foreground text-sm'
			>
				<span
					data-slot='action-bar-selection'
					aria-label={`${String(count)} selected`}
					className='font-medium tabular-nums'
				>
					{count}
				</span>
				<div className='ml-auto flex items-center gap-2'>
					{start}
					{onDelete && (
						<Button
							size='sm'
							variant='danger'
							onPress={onDelete}
						>
							<Trash2 size={16} />
							Delete
						</Button>
					)}
					{actionButtons}
					{end}
					<Button
						size='sm'
						variant='ghost'
						isIconOnly
						aria-label='Clear selection'
						onPress={onClear}
					>
						<X size={16} />
					</Button>
				</div>
			</div>
		)
	}

	return (
		<ActionBar
			open={open}
			onOpenChange={(next) => {
				if (!next) onClear()
			}}
			side='bottom'
			align='center'
			sideOffset={16}
		>
			<ActionBarGroup>
				<Chip
					data-slot='action-bar-selection'
					aria-label={`${String(count)} selected`}
					className='tabular-nums'
				>
					{count}
				</Chip>
				{hasActions && <ActionBarSeparator />}
				{start}
				{onDelete && (
					<ActionBarItem
						variant='danger'
						onSelect={keepBarOpen}
						onPress={onDelete}
					>
						<Trash2 size={16} />
						Delete
					</ActionBarItem>
				)}
				{actionButtons}
				{end}
				{/* Always present: it divides the count (and any actions) from the close button. */}
				<ActionBarSeparator />
				<Button
					size='sm'
					variant='ghost'
					isIconOnly
					aria-label='Clear selection'
					onPress={onClear}
				>
					<X size={16} />
				</Button>
			</ActionBarGroup>
		</ActionBar>
	)
}
