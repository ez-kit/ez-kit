'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button, Modal as HeroModal } from '@heroui/react'

import { KIT_CLASS_NAME } from '../../lib/kit-class-name'

import type { FormModalProps } from '@ez-kit/data-grid-react'

/**
 * The dialog `creating` and `editing` open in `mode: 'modal'`.
 * Renders a form-level error banner above the body when `formError` is set — one message per
 * line, since a schema joins several form-level issues with a newline —
 * and reflects `isPending` on the Save button.
 */
export function FormModal({ open, title, formError, isPending, onSave, onCancel, children }: FormModalProps) {
	const messages = useGridMessages()
	return (
		<HeroModal.Backdrop
			className={KIT_CLASS_NAME}
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<HeroModal.Container>
				<HeroModal.Dialog>
					<HeroModal.Header>
						<HeroModal.Heading>{title}</HeroModal.Heading>
					</HeroModal.Header>
					<HeroModal.Body>
						{formError ? (
							<div
								role='alert'
								className='dg-form-error whitespace-pre-line py-2 px-3 rounded-md mb-3'
							>
								{formError}
							</div>
						) : null}
						{children}
					</HeroModal.Body>
					<HeroModal.Footer>
						<Button
							variant='ghost'
							onPress={onCancel}
						>
							{messages.form.cancel}
						</Button>
						<Button
							variant='primary'
							isPending={isPending}
							onPress={() => void onSave()}
						>
							{messages.form.save}
						</Button>
					</HeroModal.Footer>
				</HeroModal.Dialog>
			</HeroModal.Container>
		</HeroModal.Backdrop>
	)
}
