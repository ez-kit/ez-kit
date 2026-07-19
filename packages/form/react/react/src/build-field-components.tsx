import { FormFieldType } from '@ez-kit/form-core'

import { asBoolean, asNumber, asText } from './coerce'
import { FieldFrame } from './field-frame'

import type { BindableForm, SubmitState } from './bindable-form'
import type { FormComponents } from './contract'
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
 * Build the flat field components for one form instance.
 *
 * Each component closes over both the injected `components` and the `form` it belongs to,
 * which is why they are built per instance rather than once per kit: `form.AppField` needs
 * the concrete form. `createForm` memoises the result so the identities stay stable across
 * renders and React never remounts the inputs.
 *
 * Nothing here renders a styled element — only injected primitives plus `data-*` hooks.
 */
export function buildFieldComponents<TFormData>(
	form: BindableForm,
	components: FormComponents,
): FormFieldComponents<TFormData> {
	const { TextInput, NumberInput, Textarea, Select, Checkbox, Button, Form } = components

	function TextField({ name, label, description, type, placeholder, ...rest }: TextFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<FieldFrame
						components={components}
						field={field}
						fieldType={FormFieldType.Text}
						label={label}
						description={description}
						renderInput={(binding) => (
							<TextInput
								{...binding}
								{...rest}
								{...(type !== undefined ? { type } : {})}
								{...(placeholder !== undefined ? { placeholder } : {})}
								value={asText(field.state.value)}
								onChange={(value) => {
									field.handleChange(value)
								}}
							/>
						)}
					/>
				)}
			</form.AppField>
		)
	}

	function NumberField({
		name,
		label,
		description,
		placeholder,
		min,
		max,
		step,
		...rest
	}: NumberFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<FieldFrame
						components={components}
						field={field}
						fieldType={FormFieldType.Number}
						label={label}
						description={description}
						renderInput={(binding) => (
							<NumberInput
								{...binding}
								{...rest}
								{...(placeholder !== undefined ? { placeholder } : {})}
								{...(min !== undefined ? { min } : {})}
								{...(max !== undefined ? { max } : {})}
								{...(step !== undefined ? { step } : {})}
								value={asNumber(field.state.value)}
								onChange={(value) => {
									field.handleChange(value)
								}}
							/>
						)}
					/>
				)}
			</form.AppField>
		)
	}

	function TextareaField({
		name,
		label,
		description,
		placeholder,
		rows,
		...rest
	}: TextareaFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<FieldFrame
						components={components}
						field={field}
						fieldType={FormFieldType.Textarea}
						label={label}
						description={description}
						renderInput={(binding) => (
							<Textarea
								{...binding}
								{...rest}
								{...(placeholder !== undefined ? { placeholder } : {})}
								{...(rows !== undefined ? { rows } : {})}
								value={asText(field.state.value)}
								onChange={(value) => {
									field.handleChange(value)
								}}
							/>
						)}
					/>
				)}
			</form.AppField>
		)
	}

	function SelectField({
		name,
		label,
		description,
		options,
		placeholder,
		...rest
	}: SelectFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<FieldFrame
						components={components}
						field={field}
						fieldType={FormFieldType.Select}
						label={label}
						description={description}
						renderInput={(binding) => (
							<Select
								{...binding}
								{...rest}
								{...(placeholder !== undefined ? { placeholder } : {})}
								options={options}
								value={asText(field.state.value)}
								onChange={(value) => {
									field.handleChange(value)
								}}
							/>
						)}
					/>
				)}
			</form.AppField>
		)
	}

	function CheckboxField({ name, label, description, ...rest }: CheckboxFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<FieldFrame
						components={components}
						field={field}
						fieldType={FormFieldType.Checkbox}
						label={label}
						description={description}
						renderInput={(binding) => (
							<Checkbox
								{...binding}
								{...rest}
								checked={asBoolean(field.state.value)}
								onChange={(checked) => {
									field.handleChange(checked)
								}}
							/>
						)}
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
