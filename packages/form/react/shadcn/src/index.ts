export { useForm, Form } from './form'

// Curated re-export of the consumer surface from the adapter, so a kit consumer never has
// to add `@ez-kit/form-react` as a second dependency. Deliberately not `export *`: the star
// would also re-export the unbound `createForm`, which a consumer must not call with a
// different component set and still call "the shadcn kit".
export { FormFieldType, TextInputType, formatFieldErrors, hasFieldErrors } from '@ez-kit/form-react'
export type {
	AnyFormProps,
	BaseFieldProps,
	FormControlledProps,
	CheckboxFieldProps,
	FormFieldComponents,
	FormProps,
	NumberFieldProps,
	SelectFieldProps,
	SelectOption,
	SubmitButtonProps,
	TextareaFieldProps,
	TextFieldProps,
} from '@ez-kit/form-react'
