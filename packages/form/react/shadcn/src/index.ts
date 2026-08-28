export { useForm, Form, FormRenderer, withForm, withFieldGroup } from './form'

// Curated re-export of the consumer surface from the adapter, so a kit consumer never has
// to add `@ez-kit/form-react` as a second dependency. Deliberately not `export *`: the star
// would also re-export the unbound `createForm`, which a consumer must not call with a
// different component set and still call "the shadcn kit".
export {
	FormFieldType,
	TextInputType,
	formatFieldErrors,
	hasFieldErrors,
	stripHiddenValues,
	useFieldGroup,
	useFormGroup,
} from '@ez-kit/form-react'
export type {
	AnyFormProps,
	BaseFieldProps,
	BlockRegistry,
	FormControlledProps,
	CheckboxFieldProps,
	CustomFieldRegistry,
	CustomFieldRenderProps,
	FormFieldComponents,
	FormProps,
	FormRendererControlledProps,
	FormRendererUncontrolledProps,
	KitFormBlock,
	KitWithFormProps,
	LocalizedText,
	NumberFieldProps,
	RendererForm,
	SelectFieldProps,
	SelectOption,
	SharedRendererProps,
	SubmitButtonProps,
	TextareaFieldProps,
	TextFieldProps,
	Translate,
} from '@ez-kit/form-react'

// The schema-authoring half of the same surface. It lives in `@ez-kit/form-core` and is not
// re-exported by `@ez-kit/form-react`, so the kit takes a direct dependency on core to keep
// the "one dependency" claim above true for config-driven forms as well: under pnpm's strict
// `node_modules` layout a transitive dependency is not importable, so every import the docs
// tell a reader to copy has to resolve from the kit itself.
export { FormSchemaError, buildValidator, defineFormSchema, parseFormSchema } from '@ez-kit/form-core'
export type { FormNode, FormSchema, NamedRule } from '@ez-kit/form-core'
