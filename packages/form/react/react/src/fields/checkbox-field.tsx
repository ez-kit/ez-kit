import { FormFieldType } from '@ez-kit/form-core'

import { asBoolean } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { CheckboxFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `CheckboxField` component bound to one form instance. */
export function createCheckboxField<TFormData>(
	form: BindableForm,
	KitCheckboxField: FormComponents['CheckboxField'],
): (props: CheckboxFieldProps<TFormData>) => ReactNode {
	return function CheckboxField({
		name,
		label,
		description,
		disabled,
		required,
		validate,
	}: CheckboxFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitCheckboxField
						{...fieldRenderProps(field, FormFieldType.Checkbox, { label, description, disabled, required, validate })}
						checked={asBoolean(field.state.value)}
						onChange={(checked) => {
							field.handleChange(checked)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
