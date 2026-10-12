export { SubmitButton } from './blocks/form-parts'
export { useForm, Form, SchemaForm, withForm, withFieldGroup } from './form'

// The factory and the two bags it takes, so an app can call `createForm` itself with the
// kit's field slots spread beside a field kind of its own. The ready-made bundle
// above stays the zero-config path; this is the extension one.
export {
	ArrayField,
	CheckboxField,
	CheckboxGroupField,
	DateField,
	DateRangeField,
	FormElement,
	formComponents,
	formFieldSlots,
	MultiSelectField,
	NumberField,
	RadioGroupField,
	SelectField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from './form'

// Curated re-export of the consumer surface from the adapter, so a kit consumer never has
// to add `@ez-kit/form-react` as a second dependency. Deliberately not `export *`: the star
// would also export the kit-author contract types — `FormComponents`, the per-kind
// `*RenderProps` — whose home is `custom-kit.mdx`, and writing a kit means depending on the
// adapter directly. `createForm` itself is re-exported on purpose: calling it with the kit's
// components and an extended field set is the supported way to add a field kind, so the old
// reason for withholding it (that a differently-composed bundle must not be called "the shadcn
// kit") no longer holds — what a consumer extends is still this kit's components.
export {
	clampToGridRange,
	createForm,
	defineFieldType,
	FormFieldType,
	FormOptionSources,
	formatFieldErrors,
	FormProvider,
	GRID_MAX,
	GRID_MIN,
	hasFieldErrors,
	stripHiddenValues,
	TextInputType,
	useFieldGroup,
	useFormContext,
	useFormGroup,
} from '@ez-kit/form-react'
export type {
	AnyFormInstance,
	AnyFormProps,
	ArrayFieldProps,
	ArrayFieldScope,
	ArrayItemScope,
	BaseFieldProps,
	BlockRegistry,
	CheckboxFieldProps,
	CheckboxGroupFieldProps,
	CustomFieldRegistry,
	CustomFieldRenderProps,
	FieldTypeDefinition,
	DateFieldProps,
	DateRangeFieldProps,
	DateRangeValue,
	FormContextApi,
	FormControlledProps,
	FormFieldComponents,
	FormFieldRegistry,
	FormFieldSlots,
	FormInstance,
	FormProps,
	SchemaFormControlledProps,
	SchemaFormUncontrolledProps,
	FormUncontrolledProps,
	GridItemProps,
	JsonValue,
	KitFormBlock,
	KitWithFormProps,
	LocalizedSelectOption,
	LocalizedText,
	MultiSelectFieldProps,
	NumberFieldProps,
	OptionSource,
	OptionSourceInput,
	OptionSourceRegistry,
	OptionSourceResult,
	OptionSourceRef,
	RadioGroupFieldProps,
	SearchableOptionSource,
	SectionProps,
	SelectFieldProps,
	SelectOption,
	SharedSchemaFormProps,
	SimpleOptionSource,
	SliderFieldProps,
	SubmitButtonProps,
	SubmitProps,
	SubmitRenderProps,
	SwitchFieldProps,
	TextareaFieldProps,
	TextFieldProps,
	Translate,
} from '@ez-kit/form-react'

// The schema-authoring half of the same surface. It originates in `@ez-kit/form-core` and arrives
// through `@ez-kit/form-react`, which re-exports it, so the kit has no direct dependency on core:
// under pnpm's strict `node_modules` layout a transitive dependency is not importable, so every
// import the docs tell a reader to copy has to resolve from the kit itself. `useSelector` comes the
// same way, from the one TanStack copy `@ez-kit/form-react` owns — reading the form's store through
// a second copy would read a different store.
export {
	buildValidator,
	defineFormItem,
	defineFormSchema,
	FormSchemaError,
	isFieldNode,
	parseFormSchema,
	RESERVED_NODE_TYPES,
	resolveText,
	visibleFieldNames,
	useSelector,
	walkNodes,
} from '@ez-kit/form-react'
export type {
	AnyFormSchema,
	ArrayNode,
	BlockNode,
	Condition,
	CustomFieldNode,
	FieldNode,
	FieldRef,
	FieldValidate,
	FormNode,
	FormSchema,
	NamedRule,
	OptionValue,
	ParseOptions,
	Rule,
	RuleIssue,
	SectionNode,
	StepNode,
	SubmitNode,
} from '@ez-kit/form-react'
