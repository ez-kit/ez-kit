'use client'

import { Button } from '@heroui/react'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'

import type { ActionsCellProps } from '@ez-kit/data-grid-react'

export function ActionsCell({
	isEditing,
	editingMode,
	hasEditing,
	hasDeleting,
	onEdit,
	onDelete,
	onSave,
	onCancel,
	isPending,
}: ActionsCellProps) {
	if (isEditing && editingMode !== 'modal') {
		return (
			<>
				<Button
					variant='ghost'
					size='sm'
					isIconOnly
					isDisabled={isPending}
					onPress={() => void onSave()}
				>
					{isPending ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
				</Button>
				<Button
					variant='ghost'
					size='sm'
					isIconOnly
					onPress={onCancel}
				>
					<X className='size-4' />
				</Button>
			</>
		)
	}

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
