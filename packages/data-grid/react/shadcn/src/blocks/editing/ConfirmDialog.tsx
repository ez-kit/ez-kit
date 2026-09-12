'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'
import { CircleAlert } from 'lucide-react'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@grid-shadcn/components/ui/alert-dialog'

import type { ConfirmDialogProps } from '@ez-kit/data-grid-react'

/**
 * The delete confirmation.
 *
 * The danger badge is `AlertDialogMedia`, the slot the vendored primitive already reserves for
 * it — its header grid grows a leading column when one is present. It is tinted rather than left
 * on the default `bg-muted`, because what this prompt asks is destructive; the tokens are the
 * ones the kit's form-error banner already uses. The heroui kit draws the same badge through its
 * own `AlertDialog.Icon status='danger'`, down to the size and the circle-with-exclamation glyph.
 *
 * The confirm button is `destructive` for the same reason. It was the default neutral one, which
 * left the kit disagreeing with itself: the inline Delete in the row-actions cell that raises this
 * prompt is already destructive, and so is heroui's confirm.
 */
export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	const messages = useGridMessages()
	return (
		<AlertDialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogMedia className='rounded-full bg-destructive/10 text-destructive'>
						<CircleAlert />
					</AlertDialogMedia>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>{messages.deleting.cancel}</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						onClick={onConfirm}
					>
						{messages.deleting.confirm}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
