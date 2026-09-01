import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValue, toKitOptions } from '../option-values'
import { CLEARED_VALUE, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { RadioGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `RadioGroupField` component bound to one form instance. */
export function createRadioGroupField<TFormData>(
	form: BindableForm,
	KitRadioGroupField: FormComponents['RadioGroupField'],
): (props: RadioGroupFieldProps<TFormData>) => ReactNode {
	return function RadioGroupField(props: RadioGroupFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required } = props

		// See `select-field.tsx` — the same bridge and layering, for the expanded widget.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_VALUE}
			>
				{({ options, loading }) => (
					<form.AppField name={name}>
						{(field) => (
							<KitRadioGroupField
								{...fieldRenderProps(field, FormFieldType.RadioGroup, { label, description, disabled, required })}
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
