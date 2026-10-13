/** Elements that take focus from script without further checks; `[disabled]` is excluded below. */
const FOCUSABLE_SELECTOR = [
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'button',
	'a[href]',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]',
].join(',')

const FIELD_SELECTOR = '[data-field]'
const FIELD_ATTRIBUTE = 'data-field'
const FORM_ID_ATTRIBUTE = 'data-form-id'

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
		return true
	}
	return false
}
