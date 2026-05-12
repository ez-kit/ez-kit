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
								style={{
									padding: '0.5rem 0.75rem',
									borderRadius: '0.375rem',
									background: 'color-mix(in oklab, var(--color-danger) 12%, transparent)',
									color: 'var(--color-danger)',
									border: '1px solid color-mix(in oklab, var(--color-danger) 40%, transparent)',
									marginBottom: '0.75rem',
								}}
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
