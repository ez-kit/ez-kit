'use client'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@grid-shadcn/components/ui/dialog'
import { Button } from '@grid-shadcn/components/ui/button'

import type { ModalProps } from '@ez-kit/data-grid-react'

export function Modal({ open, onClose, onSave, onCancel, title, children }: ModalProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
		>
			<DialogContent>
				{title ? (
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
				) : null}
				{children}
				{(onSave ?? onCancel) ? (
					<DialogFooter>
						{onCancel ? (
							<Button
								variant='outline'
								onClick={onCancel}
							>
								Cancel
							</Button>
						) : null}
						{onSave ? (
							<Button
								onClick={onSave}
							>
								Save
							</Button>
						) : null}
					</DialogFooter>
				) : null}
			</DialogContent>
		</Dialog>
	)
}
