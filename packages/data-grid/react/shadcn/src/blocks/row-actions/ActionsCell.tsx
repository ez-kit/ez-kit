'use client'

import { ActionsCellState } from '@ez-kit/data-grid-react'
import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import { SaveCancelButtons } from '../editing/SaveCancelButtons'

import type { ActionsCellProps } from '@ez-kit/data-grid-react'

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

	const { hasEditing, hasDeleting, onEdit, onDelete } = props

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
		</>
	)
}
