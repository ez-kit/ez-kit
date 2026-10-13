/**
 * Elements that take focus from script without further checks; `[disabled]` is excluded below.
 *
 * One literal rather than a `.join(',')` over a list: a top-level call esbuild cannot prove pure
 * stays in every bundle of the entry, the config-layer helpers' included.
 */
const FOCUSABLE_SELECTOR =
	'input:not([type="hidden"]),select,textarea,button,a[href],[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'

const FIELD_SELECTOR = '[data-field]'
const FIELD_ATTRIBUTE = 'data-field'
const FORM_ID_ATTRIBUTE = 'data-form-id'
const FOCUSED_SELECTOR = ':focus'

function isFocusable(element: Element): element is HTMLElement {
	return element instanceof HTMLElement && element.matches(FOCUSABLE_SELECTOR) && !element.matches(':disabled')
}

/** The element carrying the field's own `id`, compared by value — names hold `.` and `[`. */
function elementWithId(wrapper: Element, id: string): Element | undefined {
	if (wrapper.id === id) return wrapper
	return [...wrapper.querySelectorAll('[id]')].find((element) => element.id === id)
}

function focusTarget(wrapper: Element, id: string): HTMLElement | undefined {
	const own = elementWithId(wrapper, id)
	if (own !== undefined && isFocusable(own)) return own
	const inner = [...wrapper.querySelectorAll(FOCUSABLE_SELECTOR)].find(isFocusable)
	if (inner !== undefined) return inner
	return isFocusable(wrapper) ? wrapper : undefined
}

/**
 * Focus the first field of one form, in DOM order, that has errors.
 *
 * "First" comes from form state, not from `aria-invalid`: a kit may put that attribute on a
 * container (the shadcn radio group and slider do), so it cannot be trusted to mark the control.
 * The walk is always over the whole document and keeps only the wrappers stamped with this form's
 * id — which is what makes a `FormProvider` form with no `<form>` element, and two forms with the
 * same field names, behave like any other. A field's `id` is its `name` (`fieldRenderProps`).
 *
 * Only a focus that took counts: a control that is hidden (a collapsed section, an inactive step)
 * ignores `focus()`, so the walk checks the target is now focused and otherwise moves on to the
 * next field with errors. Opening what hides a field stays the layout's business. Returns whether
 * focus landed anywhere.
 */
export function focusFirstError(
	formId: string,
	hasErrors: (name: string) => boolean,
	root: ParentNode = document,
): boolean {
	for (const wrapper of root.querySelectorAll(FIELD_SELECTOR)) {
		if (wrapper.getAttribute(FORM_ID_ATTRIBUTE) !== formId) continue
		const name = wrapper.getAttribute(FIELD_ATTRIBUTE)
		if (name === null || !hasErrors(name)) continue
		const target = focusTarget(wrapper, name)
		if (target === undefined) continue
		target.focus()
		if (target.matches(FOCUSED_SELECTOR)) return true
	}
	return false
}

const focusFlags = new WeakMap<object, { current: boolean }>()

/** Register the `focusOnError` of one instance — read when a group submit fails (R71). */
export function setFocusOnError(form: object, flag: { current: boolean }): void {
	focusFlags.set(form, flag)
}

/** Whether `form` focuses its first error after a failed submit; `true` for an unregistered one. */
export function focusesOnError(form: object): boolean {
	return focusFlags.get(form)?.current ?? true
}

/** The members of an instance the walk reads. */
export type ErrorFocusSource = {
	formId: string
	getFieldMeta: (name: string) => { errors: readonly unknown[] } | undefined
}

/**
 * Focus the first field of `form`, in DOM order, with errors — after a failed submit or server
 * errors. `within` narrows the candidates to a group's own names (R71).
 */
export function focusFirstFieldWithErrors(
	form: ErrorFocusSource,
	within: (name: string) => boolean = () => true,
): void {
	focusFirstError(form.formId, (name) => within(name) && (form.getFieldMeta(name)?.errors.length ?? 0) > 0)
}
