'use client'

import { Button, Modal as HeroModal } from '@heroui/react'

import type { ModalProps } from '@ez-kit/data-grid-react'

export function Modal({ open, onClose, onSave, onCancel, title, children }: ModalProps) {
	return (
		<HeroModal
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
		>
			<HeroModal.Backdrop />
			<HeroModal.Container>
				<HeroModal.Dialog>
					{title ? (
						<HeroModal.Header>
							<HeroModal.Heading>{title}</HeroModal.Heading>
						</HeroModal.Header>
					) : null}
					<HeroModal.Body>{children}</HeroModal.Body>
					{(onSave ?? onCancel) ? (
						<HeroModal.Footer>
							{onCancel ? (
								<Button
									variant='ghost'
									onPress={onCancel}
								>
									Cancel
								</Button>
							) : null}
							{onSave ? (
								<Button
									variant='solid'
									onPress={onSave}
								>
									Save
								</Button>
							) : null}
						</HeroModal.Footer>
					) : null}
				</HeroModal.Dialog>
			</HeroModal.Container>
		</HeroModal>
	)
}
