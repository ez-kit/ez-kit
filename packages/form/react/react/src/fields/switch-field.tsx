import { FormFieldType } from '@ez-kit/form-core'

import { asBoolean } from '../coerce'
import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { SwitchFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `SwitchField` component bound to one form instance.
 *
 * The binder reads only its binding props; everything else the author wrote reaches the kit
 * component flat, ahead of the computed props, so a computed key always wins.
 */
export function createSwitchField<TFormData>(
	form: BindableForm,
	KitSwitchField: AllFormFieldSlots['SwitchField'],
): (props: SwitchFieldProps<TFormData>) => ReactNode {
	return function SwitchField(props: SwitchFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, BASE_FIELD_PROP_KEYS)

		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitSwitchField
						{...kitProps}
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
