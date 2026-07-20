export { createForm } from './create-form'
export { TextInputType } from './contract'

export type { BoundForm, CreateFormOptions, FormBundle } from './create-form'
export type {
	ButtonProps,
	CheckboxFieldRenderProps,
	FieldRenderProps,
	FormComponents,
	FormElementProps,
	NumberFieldRenderProps,
	SelectFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
} from './contract'
export type {
	BaseFieldProps,
	CheckboxFieldProps,
	FormFieldComponents,
	FormWrapperProps,
	NumberFieldProps,
	SelectFieldProps,
	SubmitButtonProps,
	TextareaFieldProps,
	TextFieldProps,
} from './field-props'

// Re-exported so a kit depends on `@ez-kit/form-react` alone rather than also pulling in
// `@ez-kit/form-core` for the option shape its `Select` renders.
export { FormFieldType, formatFieldErrors, hasFieldErrors } from '@ez-kit/form-core'
export type { SelectOption } from '@ez-kit/form-core'
