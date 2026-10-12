import { fieldControlProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm } from '../bindable-form'
import type { BoundFieldComponent, FieldControlProps } from '../field-props'
import type { FieldValidateProps } from '../field-validate'
import type { ReactNode } from 'react'

/** `data-field-type` of a control bound through `form.Field`, which registers no field kind. */
export const FIELD_PRIMITIVE_TYPE = 'field'

type LooseFieldProps = {
	name: string
	validate?: FieldValidateProps
	label?: ReactNode
	description?: ReactNode
	disabled?: boolean
	required?: boolean
	children: (field: FieldControlProps<unknown>) => ReactNode
}

/**
 * `form.Field`: an author's own control, bound like a registered field.
 *
 * Bound through `form.AppField` — the binding seam — exactly as the generic binder of a
 * `defineFieldType` field is, and handed the same props minus the `props` bag. `validate` runs and
 * marks `required` exactly as it does on every built-in field. `form` is anything with an
 * `AppField`: the instance, a field group (its `AppField` maps names through `fields`), or a scope
 * that prefixes them. `form.AppField` is read at render, so the instance's is the seam by then.
 */
export function createField<TFormData>(form: Pick<BindableForm, 'AppField'>): BoundFieldComponent<TFormData> {
	return function Field({
		name,
		validate,
		label,
		description,
		disabled,
		required,
		children,
	}: LooseFieldProps): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) =>
					children(
						fieldControlProps(field, FIELD_PRIMITIVE_TYPE, {
							label,
							description,
							disabled,
							required,
							validate,
						}),
					)
				}
			</form.AppField>
		)
	} as BoundFieldComponent<TFormData>
}
