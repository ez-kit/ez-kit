import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { OPTION_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'
import { fromKitValue, toKitOptions } from '../option-values'
import { CLEARED_VALUE, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { RadioGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `RadioGroupField` component bound to one form instance.
 *
 * The binder keeps the option provision and its binding props; everything else the author wrote
 * reaches the kit component flat, ahead of the computed props, so a computed key always wins.
 */
export function createRadioGroupField<TFormData>(
	form: BindableForm,
	KitRadioGroupField: AllFormFieldSlots['RadioGroupField'],
): (props: RadioGroupFieldProps<TFormData>) => ReactNode {
	return function RadioGroupField(props: RadioGroupFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, OPTION_FIELD_PROP_KEYS)

		// See `select-field.tsx` — the same bridge and layering, for the expanded widget.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_VALUE}
			>
				{({ options, loading }) => (
					<form.AppField
						name={name}
						validators={fieldValidators(name, validate)}
					>
						{(field) => (
							<KitRadioGroupField
								{...kitProps}
								{...fieldRenderProps(field, FormFieldType.RadioGroup, {
									label,
									description,
									disabled,
									required,
									validate,
								})}
								options={toKitOptions(options)}
								loading={loading}
								value={asText(field.state.value)}
								onChange={(value) => {
									field.handleChange(fromKitValue(options, value))
								}}
							/>
						)}
					</form.AppField>
				)}
			</FieldOptions>
		)
	}
}
