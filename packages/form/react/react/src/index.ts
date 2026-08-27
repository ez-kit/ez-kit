export { createForm } from './create-form'

export type { CreateFormOptions, FormBundle } from './create-form'
export type { BoundForm, KitFormApi } from './kit-form'
export type { AnyFormProps, FormControlledProps, FormProps, FormUncontrolledProps } from './form-props'
export type {
	FormRendererControlledProps,
	FormRendererUncontrolledProps,
	RendererForm,
	SharedRendererProps,
} from './schema/form-renderer'
export type {
	ButtonProps,
	CheckboxFieldRenderProps,
	FieldRenderProps,
	FormComponents,
	FormElementProps,
	GridItemRenderProps,
	NumberFieldRenderProps,
	RadioGroupFieldRenderProps,
	SectionRenderProps,
	SelectFieldRenderProps,
	SliderFieldRenderProps,
	SwitchFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
} from './contract'
export type {
	BaseFieldProps,
	CheckboxFieldProps,
	FormFieldComponents,
	NumberFieldProps,
	RadioGroupFieldProps,
	SelectFieldProps,
	SliderFieldProps,
	SubmitButtonProps,
	SwitchFieldProps,
	TextareaFieldProps,
	TextFieldProps,
} from './field-props'

// Re-exported so a kit depends on `@ez-kit/form-react` alone rather than also pulling in
// `@ez-kit/form-core` for the option shape its `Select` renders, or — for `GRID_MIN`/`GRID_MAX`/
// `clampToGridRange` — for the numeric range `columns`/`colSpan` share with `parseFormSchema`.
export {
	clampToGridRange,
	FormFieldType,
	formatFieldErrors,
	GRID_MAX,
	GRID_MIN,
	hasFieldErrors,
	TextInputType,
} from '@ez-kit/form-core'
export type { SelectOption } from '@ez-kit/form-core'
