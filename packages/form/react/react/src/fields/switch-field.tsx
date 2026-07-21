import { FormFieldType } from '@ez-kit/form-core'

import { asBoolean } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

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
	}: SwitchFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitSwitchField
						{...fieldRenderProps(field, FormFieldType.Switch, { label, description, disabled, required })}
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
