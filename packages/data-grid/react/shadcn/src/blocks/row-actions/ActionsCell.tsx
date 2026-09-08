'use client'

import { ActionsCellState, isGridMenuItemSlot } from '@ez-kit/data-grid-react'
import { Pencil, Trash2 } from 'lucide-react'
import { Fragment } from 'react'

import { Button } from '@grid-shadcn/components/ui/button'

import { SaveCancelButtons } from '../editing/SaveCancelButtons'
import { renderActionIcon } from '../icons'

import type { ActionsCellProps, GridMenuItem, GridMenuItemDef } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

/**
 * One `rowActions.actions` entry that asked for `placement: 'inline'`, as an icon button
 * matching the built-in Edit and Delete beside it. Its `icon` is required upstream, so there is
 * no label-only case to draw here.
 */
function InlineActionButton({ item }: { item: GridMenuItemDef }) {
	return (
		<Button
			variant={item.destructive === true ? 'destructive' : 'ghost'}
			size='icon'
			disabled={item.disabled === true}
			aria-label={item.label}
			title={item.label}
			data-slot='row-action'
			{...(item.className !== undefined ? { className: item.className } : {})}
			onClick={item.onAction}
		>
			{renderActionIcon(item.icon)}
		</Button>
	)
}

/** The inline entries, in the order the author returned them. */
function renderInlineActions(actions: GridMenuItem[]): ReactNode {
	return actions.map((item) =>
		// An entry that brought its own markup stands where its button would have been — the cell
		// is plain flex, so it needs no wrapper of ours.
		isGridMenuItemSlot(item) ? (
			<Fragment key={item.id}>{item.component}</Fragment>
		) : (
			<InlineActionButton
				key={item.id}
				item={item}
			/>
		),
	)
}

/**
 * The row-actions cell in all three row states. `Editing` and `Creating` both reduce to the
 * same save / cancel pair — the creating row only differs in whether Cancel is offered.
 */
export function ActionsCell(props: ActionsCellProps) {
	if (props.state === ActionsCellState.Editing) {
		return (
			<SaveCancelButtons
				onSave={props.onSave}
				onCancel={props.onCancel}
				isPending={props.isPending}
			/>
		)
	}

	if (props.state === ActionsCellState.Creating) {
		return (
			<SaveCancelButtons
				onSave={props.onSave}
				onCancel={props.onCancel}
				isPending={props.isPending}
				showCancel={props.canCancel}
			/>
		)
	}

	const { hasEditing, hasDeleting, onEdit, onDelete, actions } = props

	return (
		<>
			{hasEditing && (
				<Button
					variant='ghost'
					size='icon'
					onClick={onEdit}
				>
					<Pencil />
				</Button>
			)}
			{hasDeleting && (
				<Button
					variant='destructive'
					size='icon'
					onClick={onDelete}
				>
					<Trash2 />
				</Button>
			)}
			{renderInlineActions(actions)}
		</>
	)
}
