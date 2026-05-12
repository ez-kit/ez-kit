'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@grid-shadcn/components/ui/dialog'
import { cn } from '@grid-shadcn/lib/utils'

import type { FormShellProps } from '@ez-kit/data-grid-react'

/**
 * Unified shell for `creating` / `editing` modal forms.
 * Renders a form-level error banner above the body when `formError` is set,
 * and reflects `isPending` on the Save button (disabled + spinner).
 */
export function FormShell({ open, title, formError, isPending, onSave, onCancel, children }: FormShellProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{formError ? (
					<div
						role='alert'
						className={cn(
							'rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive',
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
						Cancel
					</Button>
					<Button
						onClick={() => void onSave()}
						disabled={isPending}
					>
						{isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
