import { formatFieldErrors, FormFieldType } from '@ez-kit/form-core'

import { asBoolean, asNumber, asText } from './coerce'

import type { BindableForm, BoundFieldApi, SubmitState } from './bindable-form'
import type { FieldRenderProps, FormComponents } from './contract'
import type {
	CheckboxFieldProps,
	FormFieldComponents,
	FormWrapperProps,
	NumberFieldProps,
	SelectFieldProps,
	SubmitButtonProps,
	TextareaFieldProps,
	TextFieldProps,
} from './field-props'
import type { ReactNode } from 'react'

/**
 * The half of a field's props that is identical for every field kind: identity, chrome
 * content, validation state and the blur handler.
 *
 * Everything visible is assembled by the kit from these; this package renders no element of
 * its own, not even a wrapper.
 */
function fieldRenderProps(
	field: BoundFieldApi,
	fieldType: FormFieldType,
	{
		label,
		description,
		disabled,
		required,
	}: { label: ReactNode; description: ReactNode; disabled: boolean | undefined; required: boolean | undefined },
): FieldRenderProps {
	const errors = formatFieldErrors(field.state.meta.errors)

	return {
		'data-field': field.name,
		'data-field-type': fieldType,
		id: field.name,
		name: field.name,
		label,
		description,
		errors,
		invalid: errors.length > 0,
		onBlur: field.handleBlur,
		disabled,
		required,
	}
}

/**
 * Build the flat field components for one form instance.
 *
 * Each component closes over both the injected `components` and the `form` it belongs to,
 * which is why they are built per instance rather than once per kit: `form.AppField` needs
 * the concrete form. `createForm` memoises the result so the identities stay stable across
 * renders and React never remounts the inputs.
 */
export function buildFieldComponents<TFormData>(
	form: BindableForm,
	components: FormComponents,
): FormFieldComponents<TFormData> {
	const {
		TextField: KitTextField,
		NumberField: KitNumberField,
		TextareaField: KitTextareaField,
		SelectField: KitSelectField,
		CheckboxField: KitCheckboxField,
		Button,
		Form,
	} = components

	function TextField({
		name,
		label,
		description,
		disabled,
		required,
		type,
		placeholder,
	}: TextFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitTextField
						{...fieldRenderProps(field, FormFieldType.Text, { label, description, disabled, required })}
						type={type}
						placeholder={placeholder}
						value={asText(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}

	function NumberField({
		name,
		label,
		description,
		disabled,
		required,
		placeholder,
		min,
		max,
		step,
	}: NumberFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitNumberField
						{...fieldRenderProps(field, FormFieldType.Number, { label, description, disabled, required })}
						placeholder={placeholder}
						min={min}
						max={max}
						step={step}
						value={asNumber(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}

	function TextareaField({
		name,
		label,
		description,
		disabled,
		required,
		placeholder,
		rows,
	}: TextareaFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitTextareaField
						{...fieldRenderProps(field, FormFieldType.Textarea, { label, description, disabled, required })}
						placeholder={placeholder}
						rows={rows}
						value={asText(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}

	function SelectField({
		name,
		label,
		description,
		disabled,
		required,
		options,
		placeholder,
	}: SelectFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitSelectField
						{...fieldRenderProps(field, FormFieldType.Select, { label, description, disabled, required })}
						options={options}
						placeholder={placeholder}
						value={asText(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}

	function CheckboxField({ name, label, description, disabled, required }: CheckboxFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitCheckboxField
						{...fieldRenderProps(field, FormFieldType.Checkbox, { label, description, disabled, required })}
						checked={asBoolean(field.state.value)}
						onChange={(checked) => {
							field.handleChange(checked)
						}}
					/>
				)}
			</form.AppField>
		)
	}

	function selectSubmitState(state: SubmitState): SubmitState {
		return { canSubmit: state.canSubmit, isSubmitting: state.isSubmitting }
	}

	function SubmitButton({ children, disabled }: SubmitButtonProps): ReactNode {
		return (
			<form.Subscribe selector={selectSubmitState}>
				{({ canSubmit, isSubmitting }) => (
					<Button
						type='submit'
						disabled={disabled === true || !canSubmit || isSubmitting}
					>
						{children}
					</Button>
				)}
			</form.Subscribe>
		)
	}

	function FormWrapper({ children, ...rest }: FormWrapperProps): ReactNode {
		return (
			<Form
				data-form=''
				noValidate
				{...rest}
				onSubmit={(event) => {
					// The browser must not navigate, and a nested form's submit must not bubble
					// out to an enclosing one.
					event.preventDefault()
					event.stopPropagation()
					void form.handleSubmit()
				}}
			>
				{children}
			</Form>
		)
	}

	return {
		TextField,
		NumberField,
		TextareaField,
		SelectField,
		CheckboxField,
		SubmitButton,
		Form: FormWrapper,
	}
}
