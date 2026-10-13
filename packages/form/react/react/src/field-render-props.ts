import { formatFieldErrors } from '@ez-kit/form-core'

import { resolveRequired } from './field-validate'

import type { BoundFieldApi, FieldValue } from './bindable-form'
import type { FieldRenderProps } from './contract'
import type { FieldControlProps } from './field-props'
import type { FieldValidateProps } from './field-validate'
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
		validate,
	}: {
		label: ReactNode
		description: ReactNode
		disabled: boolean | undefined
		required: boolean | undefined
		/**
		 * Read for `validate.required` alone — the *running* of the constraints is wired
		 * separately, onto the field's `onChange` (see `fieldValidators`). A required key
		 * typed `| undefined` rather than an optional one, so a caller with no `validate` can
		 * still pass it explicitly under `exactOptionalPropertyTypes`.
		 */
		validate: FieldValidateProps | undefined
	},
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
		'data-form-id': field.form.formId,
		id: field.name,
		name: field.name,
		label,
		description,
		errors,
		invalid: errors.length > 0,
		onBlur: field.handleBlur,
		disabled,
		required: resolveRequired(required, validate),
	}
}

/**
 * Everything a bound control receives: {@link fieldRenderProps} plus the value and a value-taking
 * `onChange`. The generic binder of a registered field adds the author's `props` bag to it;
 * `form.Field` hands it as is — which is what makes `form.Field` a one-off `defineFieldType` field.
 */
export function fieldControlProps(
	field: BoundFieldApi,
	fieldType: string,
	chrome: Parameters<typeof fieldRenderProps>[2],
): FieldControlProps<unknown> {
	return {
		...fieldRenderProps(field, fieldType, chrome),
		value: field.state.value,
		onChange: (value: unknown) => {
			// A control's value type is the author's, and `FieldValue` enumerates the built-in ones —
			// the same cast `RenderNode`'s custom branch makes, for the same reason.
			field.handleChange(value as FieldValue)
		},
	}
}
