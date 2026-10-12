'use client'

import { createContext, useContext } from 'react'

import type { ComponentType, ReactNode } from 'react'

/**
 * The docs-only plain button for the form examples — the `shared/form/Dialog.tsx` analogue for a
 * control an example draws itself.
 *
 * A form kit ships the form's own controls (`SubmitButton`, the array's add and remove), not a
 * general-purpose button: an app already has one. An example that composes its own controls — a
 * headless `form.Array` with the add control in the section heading, say — renders this, and each
 * embed route supplies its kit's button, so one source file runs under both kits.
 *
 * Like `Dialog`, the import in the displayed source is **not** rewritten to a package: this is the
 * docs' own stand-in for whatever button the reader's app already has.
 */

export type ButtonProps = {
	children: ReactNode
	onClick: () => void
	disabled?: boolean | undefined
}

/** The one presentational piece a UI kit has to provide for the examples' own controls. */
export type ButtonKit = {
	Button: ComponentType<ButtonProps>
}

const ButtonKitContext = createContext<ButtonKit | null>(null)

function useButtonKit(): ButtonKit {
	const kit = useContext(ButtonKitContext)

	if (kit === null) {
		throw new Error('button kit: none in context. Render the example inside a <ButtonKitProvider />.')
	}

	return kit
}

export function ButtonKitProvider({ kit, children }: { kit: ButtonKit; children: ReactNode }) {
	return <ButtonKitContext.Provider value={kit}>{children}</ButtonKitContext.Provider>
}

/** A non-submitting button, drawn by the active kit. */
export function Button(props: ButtonProps) {
	const { Button: KitButton } = useButtonKit()

	return <KitButton {...props} />
}
