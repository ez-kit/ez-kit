'use client'

import { Check, Pencil, Trash2, X } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'

import type { ActionsCellProps } from '@ez-kit/data-grid-react'

export function ActionsCell({ isEditing, editingMode, hasEditing, hasDeleting, onEdit, onDelete, onSave, onCancel }: ActionsCellProps) {
	if (isEditing && editingMode !== 'modal') {
		return (
			<>
				<Button
					variant='ghost'
					size='icon'
					onClick={() => void onSave()}
				>
					<Check />
				</Button>
				<Button
					variant='ghost'
					size='icon'
					onClick={onCancel}
				>
					<X />
				</Button>
			</>
		)
	}

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
					variant='ghost'
					size='icon'
					onClick={onDelete}
				>
					<Trash2 />
				</Button>
			)}
		</>
	)
}
