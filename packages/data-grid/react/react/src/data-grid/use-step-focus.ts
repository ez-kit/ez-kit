import { useCallback, useRef } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

/** Which button of a step pair was pressed. */
export const StepSide = {
	/** The step toward the start of the order — up the list. */
	Start: 'start',
	/** The step toward the end of the order — down the list. */
	End: 'end',
} as const

export type StepSide = (typeof StepSide)[keyof typeof StepSide]

/** The `data-slot` each button of a kit's step pair carries, so the hook can find them again. */
export type StepSlots = Record<StepSide, string>

/** What {@link useStepFocus} hands a kit. */
export type StepFocus = {
	/** A ref for the element that contains every row of the list. */
	ref: (node: HTMLElement | null) => void
	/** Call from a step button's handler, before the step itself, naming the row and the side. */
	keep: (rowId: string, side: StepSide) => void
}

const OTHER_SIDE: Record<StepSide, StepSide> = { [StepSide.Start]: StepSide.End, [StepSide.End]: StepSide.Start }

/** Whether a control can take focus and act — a disabled button can hold focus and ignore every key. */
function isOperable(element: Element | null | undefined): element is HTMLElement {
	return (
		element instanceof HTMLElement && !element.matches(':disabled') && element.getAttribute('aria-disabled') !== 'true'
	)
}

/**
 * Keep keyboard focus on a list's step pair across the step it triggers.
 *
 * A step loses focus two ways, both silent: a row that moves down is re-inserted into the DOM, which
 * blurs whatever was focused inside it, and a row that reaches either end disables the very button
 * that moved it. Either way a keyboard user pressing the step again finds nothing focused. So the
 * kit names the row and the side as the button is pressed, and once the list has re-rendered this
 * focuses that button again — or the other one, when the pressed one is now disabled.
 *
 * Rows are found by `data-column-id`, which both lists that offer a step pair already stamp, and the
 * buttons by the `data-slot` values the kit passes in. Runs after every render of the caller, so it
 * must be called from the component that re-renders when the list does.
 */
export function useStepFocus(slots: StepSlots): StepFocus {
	const containerRef = useRef<HTMLElement | null>(null)
	const pendingRef = useRef<{ rowId: string; side: StepSide } | null>(null)

	useSafeLayoutEffect(() => {
		const pending = pendingRef.current
		const container = containerRef.current
		if (!pending || !container) return
		pendingRef.current = null

		const row = [...container.querySelectorAll('[data-column-id]')].find(
			(candidate) => candidate.getAttribute('data-column-id') === pending.rowId,
		)
		const pressed = row?.querySelector(`[data-slot="${slots[pending.side]}"]`)
		const other = row?.querySelector(`[data-slot="${slots[OTHER_SIDE[pending.side]]}"]`)
		const target = isOperable(pressed) ? pressed : isOperable(other) ? other : null

		if (target && target !== target.ownerDocument.activeElement) target.focus()
	})

	const ref = useCallback((node: HTMLElement | null) => {
		containerRef.current = node
	}, [])
	const keep = useCallback((rowId: string, side: StepSide) => {
		pendingRef.current = { rowId, side }
	}, [])

	return { ref, keep }
}
