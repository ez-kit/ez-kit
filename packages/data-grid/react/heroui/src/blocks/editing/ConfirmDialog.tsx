'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'
import { Button, Modal } from '@heroui/react'

import type { ConfirmDialogProps } from '@ez-kit/data-grid-react'

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	const messages = useGridMessages()
	return (
		<Modal.Backdrop
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<Modal.Container>
				<Modal.Dialog>
					<Modal.Header>
						<Modal.Heading>{title}</Modal.Heading>
					</Modal.Header>
					<Modal.Body>{description}</Modal.Body>
					<Modal.Footer>
						<Button
							variant='ghost'
							onPress={onCancel}
						>
							{messages.deleting.cancel}
						</Button>
						<Button
							variant='danger'
							onPress={onConfirm}
						>
							{messages.deleting.confirm}
						</Button>
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
