import { FormFieldType } from '@ez-kit/form-core'

import { asOptionValueTexts } from '../coerce'
import { OPTION_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'
import { fromKitValues, toKitOptions } from '../option-values'
import { CLEARED_LIST, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { CheckboxGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `CheckboxGroupField` component bound to one form instance.
 *
 * The binder keeps the option provision and its binding props; everything else the author wrote
 * reaches the kit component flat, ahead of the computed props, so a computed key always wins.
 */
export function createCheckboxGroupField<TFormData>(
	form: BindableForm,
	KitCheckboxGroupField: AllFormFieldSlots['CheckboxGroupField'],
): (props: CheckboxGroupFieldProps<TFormData>) => ReactNode {
	return function CheckboxGroupField(props: CheckboxGroupFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, OPTION_FIELD_PROP_KEYS)

		// See `select-field.tsx` — the same bridge and layering, for the expanded widget.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_LIST}
			>
				{({ options, loading }) => (
					<form.AppField
						name={name}
						validators={fieldValidators(name, validate)}
					>
						{(field) => (
							<KitCheckboxGroupField
								{...kitProps}
								{...fieldRenderProps(field, FormFieldType.CheckboxGroup, {
									label,
									description,
									disabled,
									required,
									validate,
								})}
								options={toKitOptions(options)}
								loading={loading}
								value={asOptionValueTexts(field.state.value)}
								onChange={(value) => {
									field.handleChange(fromKitValues(options, value))
								}}
							/>
						)}
					</form.AppField>
				)}
			</FieldOptions>
		)
	}
}
