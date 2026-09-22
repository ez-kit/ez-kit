import type { KeyboardEvent } from 'react'

/**
 * Controls that already give `Alt+Arrow` a meaning of their own: `Option+Arrow` moves by word
 * in a text field, and `Alt+ArrowDown` opens a native `select`.
 *
 * Checkboxes, radios and buttons use neither, which is why they are excluded: a row's focus is
 * always on one of them, and a predicate that counted them would refuse every event row
 * reordering exists to handle.
 */
const TEXT_ENTRY_SELECTOR =
	'textarea, select, [contenteditable=""], [contenteditable="true"], ' +
	'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'

/**
 * Whether a keyboard event started in a control that owns `Alt+Arrow`.
 *
 * Used by both `Alt+Arrow` reorderings — the column's, on the `<th>`, and the row's, on the
 * `<tr>` — which are keyboard chords on a container rather than clicks on a control, so they
 * have to ask what is focused inside.
 *
 * It replaced a second, broader predicate (`isInteractiveTarget`, "did this start on anything
 * interactive") that the header's sort affordance used to filter its own clicks. That one is
 * gone: the affordance is a real `<button>` now, so a click on it means sort and there is
 * nothing to ask. The broad predicate could not tell a control a consumer put in `column.header`
 * from the kit's own sort arrow, and dropped the clicks on the arrow — which sits at the
 * header's centre, i.e. exactly where a pointer lands.
 */
export function isTextEntryTarget(event: KeyboardEvent): boolean {
	const target = event.target
	if (!(target instanceof Element)) return false
	const entry = target.closest(TEXT_ENTRY_SELECTOR)
	return entry !== null && entry !== event.currentTarget
}
