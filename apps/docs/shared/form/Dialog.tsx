'use client'

import { createContext, useContext, useMemo } from 'react'

import type { ComponentType, ReactNode } from 'react'

/**
 * The docs-only dialog for the form examples — the `shared/form/FormKit.tsx` analogue for
 * the piece of chrome a form example needs but no form package ships.
 *
 * A form kit is the form, not the overlay: `@ez-kit/form-shadcn` has no dialog, and the two
 * kits' real overlays are shaped differently (`Dialog` → `DialogContent` in shadcn,
 * `Modal.Backdrop` → `Modal.Container` → `Modal.Dialog` in HeroUI). The examples run under
 * both kits from one source file, so they address the narrow contract below and each embed
 * route supplies its kit's implementation — exactly how `FormKitProvider` supplies the form.
 *
 * Unlike `FormKit`, the import in the displayed source is **not** rewritten to a package:
 * the shape here is the docs' own normalisation, and naming `@heroui/react` beside markup
 * that is not HeroUI's would be a lie. It is the anatomy the getting-started page documents
 * in prose, so a reader maps it onto whatever dialog their app already has.
 */

export type DialogTriggerProps = {
	children: ReactNode
	onClick: () => void
}

export type DialogContentProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	children: ReactNode
}

export type DialogSectionProps = {
	children: ReactNode
}

/** The presentational pieces one UI kit has to provide for the examples to render. */
export type DialogKit = {
	/** Opens the dialog. The kit's own button, so the example ships no hand-styled trigger. */
	Trigger: ComponentType<DialogTriggerProps>
	/** The overlay itself. Must unmount its children while closed — the examples rely on it. */
	Content: ComponentType<DialogContentProps>
	Body: ComponentType<DialogSectionProps>
	Footer: ComponentType<DialogSectionProps>
	/** A secondary button that dismisses the dialog without submitting. */
	Close: ComponentType<DialogTriggerProps>
}

const DialogKitContext = createContext<DialogKit | null>(null)

function useDialogKit(): DialogKit {
	const kit = useContext(DialogKitContext)

	if (kit === null) {
		throw new Error('dialog kit: none in context. Render the example inside a <DialogKitProvider />.')
	}

	return kit
}

export function DialogKitProvider({ kit, children }: { kit: DialogKit; children: ReactNode }) {
	return <DialogKitContext.Provider value={kit}>{children}</DialogKitContext.Provider>
}

type DialogState = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

const DialogStateContext = createContext<DialogState | null>(null)

function useDialogState(): DialogState {
	const state = useContext(DialogStateContext)

	if (state === null) {
		throw new Error('dialog: a <Dialog.*> member was rendered outside its <Dialog>.')
	}

	return state
}

/**
 * Holds the open state so `Trigger` and `Close` can toggle it without the example wiring a
 * callback to each. The state stays the example's — it is passed in, not owned here.
 */
function DialogRoot({ open, onOpenChange, children }: DialogState & { children: ReactNode }) {
	const state = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange])

	return <DialogStateContext.Provider value={state}>{children}</DialogStateContext.Provider>
}

function DialogTrigger({ children }: DialogSectionProps) {
	const { onOpenChange } = useDialogState()
	const { Trigger } = useDialogKit()

	return (
		<Trigger
			onClick={() => {
				onOpenChange(true)
			}}
		>
			{children}
		</Trigger>
	)
}

function DialogContent({ title, children }: { title: string; children: ReactNode }) {
	const { open, onOpenChange } = useDialogState()
	const { Content } = useDialogKit()

	return (
		<Content
			open={open}
			onOpenChange={onOpenChange}
			title={title}
		>
			{children}
		</Content>
	)
}

function DialogBody({ children }: DialogSectionProps) {
	const { Body } = useDialogKit()

	return <Body>{children}</Body>
}

function DialogFooter({ children }: DialogSectionProps) {
	const { Footer } = useDialogKit()

	return <Footer>{children}</Footer>
}

function DialogClose({ children }: DialogSectionProps) {
	const { onOpenChange } = useDialogState()
	const { Close } = useDialogKit()

	return (
		<Close
			onClick={() => {
				onOpenChange(false)
			}}
		>
			{children}
		</Close>
	)
}

export const Dialog = Object.assign(DialogRoot, {
	Trigger: DialogTrigger,
	Content: DialogContent,
	Body: DialogBody,
	Footer: DialogFooter,
	Close: DialogClose,
})
