'use client'

import { Button, Modal } from '@heroui/react'

import type { ConfirmDialogProps } from '@ez-kit/data-grid-react'

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	return (
		<Modal
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<Modal.Backdrop />
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
							Cancel
						</Button>
						<Button
							variant='danger'
							onPress={onConfirm}
						>
							Confirm
						</Button>
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal>
	)
}
