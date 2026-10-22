'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Loader2 } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@grid-shadcn/components/ui/dialog'
import { KIT_CLASS_NAME } from '@grid-shadcn/lib/kit-class-name'
import { cn } from '@grid-shadcn/lib/utils'

import type { FormModalProps } from '@ez-kit/data-grid-react'

/**
 * The dialog `creating` and `editing` open in `mode: 'modal'`.
 * Renders a form-level error banner above the body when `formError` is set — one message per
 * line, since a schema joins several form-level issues with a newline —
 * and reflects `isPending` on the Save button (disabled + spinner).
 */
export function FormModal({ open, title, formError, isPending, onSave, onCancel, children }: FormModalProps) {
	const messages = useGridMessages()
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<DialogContent className={KIT_CLASS_NAME}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{formError ? (
					<div
						role='alert'
						className={cn(
							'whitespace-pre-line rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive',
						)}
					>
						{formError}
					</div>
				) : null}
				{children}
				<DialogFooter>
					<Button
						variant='outline'
						onClick={onCancel}
					>
						{messages.form.cancel}
					</Button>
					<Button
						onClick={() => void onSave()}
						disabled={isPending}
					>
						{isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
						{messages.form.save}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
