'use client'

import { Button, Modal as HeroModal } from '@heroui/react'

import type { FormShellProps } from '@ez-kit/data-grid-react'

/**
 * Unified shell for `creating` / `editing` modal forms.
 * Renders a form-level error banner above the body when `formError` is set,
 * and reflects `isPending` on the Save button.
 */
export function FormShell({ open, title, formError, isPending, onSave, onCancel, children }: FormShellProps) {
	return (
		<HeroModal
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<HeroModal.Backdrop />
			<HeroModal.Container>
				<HeroModal.Dialog>
					<HeroModal.Header>
						<HeroModal.Heading>{title}</HeroModal.Heading>
					</HeroModal.Header>
					<HeroModal.Body>
						{formError ? (
							<div
								role='alert'
								className='dg-form-error py-2 px-3 rounded-md mb-3'
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
							Cancel
						</Button>
						<Button
							variant='primary'
							isPending={isPending}
							onPress={() => void onSave()}
						>
							Save
						</Button>
					</HeroModal.Footer>
				</HeroModal.Dialog>
			</HeroModal.Container>
		</HeroModal>
	)
}
