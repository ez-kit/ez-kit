import { FormFieldType } from '@ez-kit/form-core'

import { asBoolean } from '../coerce'
import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { CheckboxFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `CheckboxField` component bound to one form instance.
 *
 * The binder reads only its binding props; everything else the author wrote reaches the kit
 * component flat, ahead of the computed props, so a computed key always wins.
 */
export function createCheckboxField<TFormData>(
	form: BindableForm,
	KitCheckboxField: AllFormFieldSlots['CheckboxField'],
): (props: CheckboxFieldProps<TFormData>) => ReactNode {
	return function CheckboxField(props: CheckboxFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, BASE_FIELD_PROP_KEYS)

		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitCheckboxField
						{...kitProps}
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
