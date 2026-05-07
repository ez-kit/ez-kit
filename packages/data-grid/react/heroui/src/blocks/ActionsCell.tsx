'use client'

import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@heroui/react'

import type { ActionsCellProps } from '@ez-kit/data-grid-react'

export function ActionsCell({ isEditing, editingMode, hasEditing, hasDeleting, onEdit, onDelete, onSave, onCancel }: ActionsCellProps) {
	if (isEditing && editingMode !== 'modal') {
		return (
			<>
				<Button
					variant='ghost'
					isIconOnly
					onPress={() => void onSave()}
				>
					<Check size={16} />
				</Button>
				<Button
					variant='ghost'
					isIconOnly
					onPress={onCancel}
				>
					<X size={16} />
				</Button>
			</>
		)
	}

	return (
		<>
			{hasEditing && (
				<Button
					variant='ghost'
					isIconOnly
					onPress={onEdit}
				>
					<Pencil size={16} />
				</Button>
			)}
			{hasDeleting && (
				<Button
					variant='danger-soft'
					isIconOnly
					onPress={onDelete}
				>
					<Trash2 size={16} />
				</Button>
			)}
		</>
	)
}
