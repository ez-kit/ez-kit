import { FormFieldType } from '@ez-kit/form-core'

import { asIsoDate } from '../coerce'
import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { DateFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `DateField` component bound to one form instance.
 *
 * The binder reads only its binding props; everything else the author wrote reaches the kit
 * component flat, ahead of the computed props, so a computed key always wins.
 */
export function createDateField<TFormData>(
	form: BindableForm,
	KitDateField: AllFormFieldSlots['DateField'],
): (props: DateFieldProps<TFormData>) => ReactNode {
	return function DateField(props: DateFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, BASE_FIELD_PROP_KEYS)

		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitDateField
						{...kitProps}
						{...fieldRenderProps(field, FormFieldType.Date, { label, description, disabled, required, validate })}
						value={asIsoDate(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
