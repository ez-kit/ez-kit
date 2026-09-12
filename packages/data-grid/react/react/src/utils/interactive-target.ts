import type { KeyboardEvent, MouseEvent } from 'react'

const INTERACTIVE_SELECTOR = 'button, a[href], input, select, textarea, label, [role="button"], [role="link"]'

/**
 * Whether a click originated inside something interactive that the consumer put in the header.
 *
 * The column's `header` content sits inside the sort affordance, because clicking a column's name
 * to sort it is how every table works. That made any button or link placed there fire the sort as
 * well — the click bubbled straight into the handler. Ignoring clicks that start on an interactive
 * descendant keeps both behaviours: the name still sorts, a control in the header does not.
 */
export function isInteractiveTarget(event: MouseEvent | KeyboardEvent): boolean {
	const target = event.target
	if (!(target instanceof Element)) return false
	const interactive = target.closest(INTERACTIVE_SELECTOR)
	return interactive !== null && interactive !== event.currentTarget
}

/**
 * Controls that already give `Alt+Arrow` a meaning of their own: `Option+Arrow` moves by word
 * in a text field, and `Alt+ArrowDown` opens a native `select`.
 *
 * Checkboxes, radios and buttons use neither, which is the whole point of the distinction —
 * see {@link isTextEntryTarget}.
 */
const TEXT_ENTRY_SELECTOR =
	'textarea, select, [contenteditable=""], [contenteditable="true"], ' +
	'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'

/**
 * Whether a keyboard event started in a control that owns `Alt+Arrow`.
 *
 * The row's counterpart to {@link isInteractiveTarget}, and deliberately narrower. A header's
 * focus sits on a plain `div`, so the broad predicate costs it nothing. A **row's** focus is
 * always on a button or a checkbox — there is nothing else in a row to focus — so the broad
 * predicate there would refuse every event row reordering exists to handle.
 */
export function isTextEntryTarget(event: KeyboardEvent): boolean {
	const target = event.target
	if (!(target instanceof Element)) return false
	const entry = target.closest(TEXT_ENTRY_SELECTOR)
	return entry !== null && entry !== event.currentTarget
}
