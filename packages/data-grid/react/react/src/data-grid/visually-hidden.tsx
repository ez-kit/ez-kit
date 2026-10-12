import type { ReactNode } from 'react'

/**
 * Text for the accessibility tree only — rendered, named, and clipped out of sight by the
 * structural stylesheet's `[data-slot='sr-only']` rule.
 *
 * Real text rather than an `aria-label` on the surrounding element, because a `<th>`'s
 * accessible name is its content and the element itself is a kit component (`core.Th`) whose
 * prop forwarding this package does not own.
 *
 * It authors no class: the slot attribute is the whole contract, which is what keeps this inside
 * the no-styles rule for this package.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
	return <span data-slot='sr-only'>{children}</span>
}

/**
 * The same clipped text, announced when it changes — a polite live region.
 *
 * Separate from {@link VisuallyHidden} rather than a `role` prop on it, because the two are
 * different things to a screen reader: one is text that happens to be invisible, the other is a
 * standing promise that anything replacing its content will be read out. A caller should have to
 * mean it.
 */
export function VisuallyHiddenStatus({ children }: { children: ReactNode }) {
	return (
		<span
			data-slot='sr-only'
			role='status'
			aria-live='polite'
		>
			{children}
		</span>
	)
}

/**
 * The accessible name of a form control the grid renders **inline** — a column filter, a cell in
 * the draft creating row, a cell being edited in place.
 *
 * All three render a control with no visible label, because the column header above it is the
 * label a sighted user reads. A screen reader has no such route: axe reports `label` (critical)
 * on every one of them, in both kits, which is what this fixes. The modal forms are unaffected —
 * `auto-form.tsx` puts a real `label` on the `FieldState` and the kits' composites render a
 * visible `<label>` from it.
 *
 * A `<label htmlFor>` rather than an `aria-label`, because the control is the **kit's** component
 * and only some of them forward that attribute — but every one honours `FieldState.id`, which is
 * what this binds to. Where the grid renders the control itself (its fallback `core.Input`, typed
 * `InputHTMLAttributes<HTMLInputElement>`) it takes the attribute directly instead, and no label
 * element is rendered.
 */
export function VisuallyHiddenLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
	return (
		<label
			data-slot='sr-only'
			htmlFor={htmlFor}
		>
			{children}
		</label>
	)
}

/**
 * A column's header text, when it is text — the name to give a control rendered under that
 * header. Falls back to the column id, which is what a column with an element for a header would
 * otherwise leave the control with: nothing.
 */
export function columnNameOf(header: unknown, columnId: string): string {
	return typeof header === 'string' ? header : columnId
}
