import { FormFieldType } from '@ez-kit/form-core'

import { asNumber } from '../coerce'
import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { NumberFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `NumberField` component bound to one form instance.
 *
 * The binder reads only its binding props; everything else the author wrote reaches the kit
 * component flat, ahead of the computed props, so a computed key always wins.
 */
export function createNumberField<TFormData>(
	form: BindableForm,
	KitNumberField: AllFormFieldSlots['NumberField'],
): (props: NumberFieldProps<TFormData>) => ReactNode {
	return function NumberField(props: NumberFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, BASE_FIELD_PROP_KEYS)

		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitNumberField
						{...kitProps}
						{...fieldRenderProps(field, FormFieldType.Number, { label, description, disabled, required, validate })}
						value={asNumber(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
