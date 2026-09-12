'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'
import { AlertDialog, Button } from '@heroui/react'

import type { ConfirmDialogProps } from '@ez-kit/data-grid-react'

/**
 * The delete confirmation — `AlertDialog`, not `Modal`.
 *
 * `ConfirmDialog` serves one feature (`deleting`), and what it asks is always destructive and
 * always irreversible. That is the WAI-ARIA alertdialog pattern rather than the dialog one, so
 * this uses the component that implements it: `role="alertdialog"` makes a screen reader
 * announce the prompt as an alert instead of reading it only once focus lands inside, and
 * `isDismissable` defaults to false, so a stray click on the backdrop no longer counts as an
 * answer. It also matches the shadcn kit, which has been on Radix's `AlertDialog` all along.
 *
 * `isKeyboardDismissDisabled` is turned back off deliberately. HeroUI defaults it to `true` for
 * an alert dialog — reasonable when the dialog is the only way to abandon a half-finished
 * flow — but here Escape is the fast "no", the safe answer, and the one Radix already accepts
 * on the other kit. A confirmation a keyboard user cannot back out of is the wrong asymmetry:
 * it makes refusing harder than confirming.
 */
export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	const messages = useGridMessages()
	return (
		<AlertDialog.Backdrop
			isOpen={open}
			isKeyboardDismissDisabled={false}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<AlertDialog.Container>
				<AlertDialog.Dialog>
					<AlertDialog.Header>
						<AlertDialog.Icon status='danger' />
						<AlertDialog.Heading>{title}</AlertDialog.Heading>
					</AlertDialog.Header>
					<AlertDialog.Body>{description}</AlertDialog.Body>
					<AlertDialog.Footer>
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
					</AlertDialog.Footer>
				</AlertDialog.Dialog>
			</AlertDialog.Container>
		</AlertDialog.Backdrop>
	)
}
