import { FormFieldType } from '@ez-kit/form-core'

import { asNumber } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { SliderFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Where the thumb rests when the form value is not (yet) a number. A slider has no "empty"
 * position, so it falls back to the track's own start — the declared `min`, or the same `0`
 * Radix and React Aria default their minimum to.
 */
const DEFAULT_SLIDER_ORIGIN = 0

/** Build the `SliderField` component bound to one form instance. */
export function createSliderField<TFormData>(
	form: BindableForm,
	KitSliderField: FormComponents['SliderField'],
): (props: SliderFieldProps<TFormData>) => ReactNode {
	return function SliderField({
		name,
		label,
		description,
		disabled,
		required,
		min,
		max,
		step,
	}: SliderFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitSliderField
						{...fieldRenderProps(field, FormFieldType.Slider, { label, description, disabled, required })}
						min={min}
						max={max}
						step={step}
						value={asNumber(field.state.value) ?? min ?? DEFAULT_SLIDER_ORIGIN}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
