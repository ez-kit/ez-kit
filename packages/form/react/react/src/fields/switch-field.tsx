import { FormFieldType } from '@ez-kit/form-core'

import { asBoolean } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { SwitchFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `SwitchField` component bound to one form instance. */
export function createSwitchField<TFormData>(
	form: BindableForm,
	KitSwitchField: FormComponents['SwitchField'],
): (props: SwitchFieldProps<TFormData>) => ReactNode {
	return function SwitchField({
		name,
		label,
		description,
		disabled,
		required,
		validate,
	}: SwitchFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitSwitchField
						{...fieldRenderProps(field, FormFieldType.Switch, { label, description, disabled, required, validate })}
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
