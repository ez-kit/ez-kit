'use client'

import { RowActionsMode } from '@ez-kit/data-grid-react'
import { Button } from '@heroui/react'
import { Pencil, Trash2 } from 'lucide-react'

import { SaveCancelButtons } from '../editing/SaveCancelButtons'

import type { ActionsCellProps } from '@ez-kit/data-grid-react'

/**
 * The row-actions cell in all three row states. `Editing` and `Creating` both reduce to the
 * same save / cancel pair — the creating row only differs in whether Cancel is offered.
 */
export function ActionsCell(props: ActionsCellProps) {
	if (props.mode === RowActionsMode.Editing) {
		return (
			<SaveCancelButtons
				onSave={props.onSave}
				onCancel={props.onCancel}
				isPending={props.isPending}
			/>
		)
	}

	if (props.mode === RowActionsMode.Creating) {
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
					size='sm'
					isIconOnly
					onPress={onEdit}
				>
					<Pencil className='size-4' />
				</Button>
			)}
			{hasDeleting && (
				<Button
					variant='danger-soft'
					size='sm'
					isIconOnly
					onPress={onDelete}
				>
					<Trash2 className='size-4' />
				</Button>
			)}
		</>
	)
}
