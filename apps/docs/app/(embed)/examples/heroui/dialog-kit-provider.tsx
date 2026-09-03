'use client'

import { Button, Modal } from '@heroui/react'

import { DialogKitProvider } from '@/shared/form/Dialog'

import type { DialogContentProps, DialogSectionProps, DialogTriggerProps } from '@/shared/form/Dialog'
import type { ReactNode } from 'react'

/**
 * Supplies the HeroUI modal to every form example rendered under this route.
 *
 * `Modal.Backdrop` is driven in its controlled form (`isOpen` / `onOpenChange`) rather than
 * through `<Modal>`'s built-in trigger, so the example owns the open state exactly as the
 * shadcn route does — and so closing unmounts the `<Form>` inside.
 */

function Trigger({ children, onClick }: DialogTriggerProps) {
	return (
		<Button
			className='self-start'
			variant='secondary'
			onPress={onClick}
		>
			{children}
		</Button>
	)
}

function Content({ open, onOpenChange, title, children }: DialogContentProps) {
	return (
		<Modal.Backdrop
			isOpen={open}
			onOpenChange={onOpenChange}
		>
			<Modal.Container>
				<Modal.Dialog className='sm:max-w-md'>
					<Modal.CloseTrigger />
					<Modal.Header>
						<Modal.Heading>{title}</Modal.Heading>
					</Modal.Header>
					{children}
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

function Body({ children }: DialogSectionProps) {
	return <Modal.Body className='flex flex-col gap-4'>{children}</Modal.Body>
}

function Footer({ children }: DialogSectionProps) {
	return <Modal.Footer>{children}</Modal.Footer>
}

function Close({ children, onClick }: DialogTriggerProps) {
	return (
		<Button
			variant='secondary'
			onPress={onClick}
		>
			{children}
		</Button>
	)
}

export function HerouiDialogKitProvider({ children }: { children: ReactNode }) {
	return <DialogKitProvider kit={{ Trigger, Content, Body, Footer, Close }}>{children}</DialogKitProvider>
}
