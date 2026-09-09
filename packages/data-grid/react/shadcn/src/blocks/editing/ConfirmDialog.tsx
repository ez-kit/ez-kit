'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@grid-shadcn/components/ui/alert-dialog'

import type { ConfirmDialogProps } from '@ez-kit/data-grid-react'

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
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>{messages.deleting.cancel}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{messages.deleting.confirm}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
