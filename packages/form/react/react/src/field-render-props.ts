import { formatFieldErrors } from '@ez-kit/form-core'

import type { BoundFieldApi } from './bindable-form'
import type { FieldRenderProps } from './contract'
import type { ReactNode } from 'react'

/**
 * The half of a field's props that is identical for every field kind: identity, chrome
 * content, validation state and the blur handler.
 *
 * Everything visible is assembled by the kit from these; this package renders no element of
 * its own, not even a wrapper.
 */
export function fieldRenderProps(
	field: BoundFieldApi,
	/**
	 * The node's `type`, verbatim — `string`, not `FormFieldType`, because a **custom** field
	 * kind is an author-chosen string the enum by definition does not list. Narrowing this to
	 * the enum bought nothing (`data-field-type` is stringified either way) and cost a
	 * `node.type as unknown as FormFieldType` double cast at the one custom-field call site.
	 * Every built-in caller still passes an enum member.
	 */
	fieldType: string,
	{
		label,
		description,
		disabled,
		required,
	}: { label: ReactNode; description: ReactNode; disabled: boolean | undefined; required: boolean | undefined },
): FieldRenderProps {
	// Spec §7.2 attaches the schema's generated validator to the *form's* `onChange`, so the
	// first keystroke anywhere computes an error for every empty required field in the whole
	// document. That is right for *running* the validator — it is what keeps `canSubmit`
	// honest — and wrong for *showing* the result: without this gate one keystroke reddens
	// fields the user has never so much as focused. `isTouched` is the exact question to ask:
	// TanStack sets it on a field's own first change or blur, and on every field at submit, so
	// a submit attempt still surfaces everything. (`isBlurred` would add nothing — `handleBlur`
	// sets `isTouched` too, so it implies this one.) Only display is gated; the validator still
	// runs on every change and the submit gate is untouched.
	const errors = field.state.meta.isTouched ? formatFieldErrors(field.state.meta.errors) : []

	return {
		'data-field': field.name,
		'data-field-type': fieldType,
		id: field.name,
		name: field.name,
		label,
		description,
		errors,
		invalid: errors.length > 0,
		onBlur: field.handleBlur,
		disabled,
		required,
	}
}
