'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DialogKitProvider } from '@/shared/form/Dialog'

import type { DialogContentProps, DialogSectionProps, DialogTriggerProps } from '@/shared/form/Dialog'
import type { ReactNode } from 'react'

/**
 * Supplies the shadcn dialog to every form example rendered under this route.
 *
 * Radix unmounts the content while the dialog is closed, which is what the in-a-dialog
 * example demonstrates: reopening mounts a fresh `<Form>` with no `reset` call.
 */

function Trigger({ children, onClick }: DialogTriggerProps) {
	return (
		<Button
			type='button'
			variant='outline'
			className='self-start'
			onClick={onClick}
		>
			{children}
		</Button>
	)
}

function Content({ open, onOpenChange, title, children }: DialogContentProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	)
}

function Body({ children }: DialogSectionProps) {
	return <div className='flex flex-col gap-4'>{children}</div>
}

function Footer({ children }: DialogSectionProps) {
	return <DialogFooter>{children}</DialogFooter>
}

function Close({ children, onClick }: DialogTriggerProps) {
	return (
		<Button
			type='button'
			variant='ghost'
			onClick={onClick}
		>
			{children}
		</Button>
	)
}

export function ShadcnDialogKitProvider({ children }: { children: ReactNode }) {
	return <DialogKitProvider kit={{ Trigger, Content, Body, Footer, Close }}>{children}</DialogKitProvider>
}
