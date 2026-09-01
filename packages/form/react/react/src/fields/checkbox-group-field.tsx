import { FormFieldType } from '@ez-kit/form-core'

import { asOptionValueTexts } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValues, toKitOptions } from '../option-values'
import { CLEARED_LIST, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { CheckboxGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `CheckboxGroupField` component bound to one form instance. */
export function createCheckboxGroupField<TFormData>(
	form: BindableForm,
	KitCheckboxGroupField: FormComponents['CheckboxGroupField'],
): (props: CheckboxGroupFieldProps<TFormData>) => ReactNode {
	return function CheckboxGroupField(props: CheckboxGroupFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required } = props

		// See `select-field.tsx` — the same bridge and layering, for the expanded widget.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_LIST}
			>
				{({ options, loading }) => (
					<form.AppField name={name}>
						{(field) => (
							<KitCheckboxGroupField
								{...fieldRenderProps(field, FormFieldType.CheckboxGroup, { label, description, disabled, required })}
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
