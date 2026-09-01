import { FormFieldType } from '@ez-kit/form-core'

import { asStringArray } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { CheckboxGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `CheckboxGroupField` component bound to one form instance. */
export function createCheckboxGroupField<TFormData>(
	form: BindableForm,
	KitCheckboxGroupField: FormComponents['CheckboxGroupField'],
): (props: CheckboxGroupFieldProps<TFormData>) => ReactNode {
	return function CheckboxGroupField({
		name,
		label,
		description,
		disabled,
		required,
		options,
	}: CheckboxGroupFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitCheckboxGroupField
						{...fieldRenderProps(field, FormFieldType.CheckboxGroup, { label, description, disabled, required })}
						options={options}
						value={asStringArray(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
