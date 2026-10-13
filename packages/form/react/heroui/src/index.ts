// Every component straight from its block, never through `./form`: the module that assembles the
// prebuilt bundle names all of them, so an import routed through it is what used to drag the date
// picker, the comboboxes and the schema renderer into a one-field form.
export { ArrayField } from './blocks/array'
export { DateField, DateRangeField } from './blocks/date'
export {
	CheckboxField,
	NumberField,
	RadioGroupField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from './blocks/fields'
export { FormElement, SubmitButton } from './blocks/form-parts'
export { GridItem, Section } from './blocks/layout'
export { CheckboxGroupField, MultiSelectField } from './blocks/multi-value'
export { SelectField } from './blocks/select'
export { Wizard } from './blocks/wizard'

// Every component at once, in the two bags `createForm` takes — a deliberate "everything", for an
// app that spreads the kit beside a field kind of its own.
export { allFormComponents, allFormFields } from './sets'

// The prebuilt bundle: the zero-config path. Its binding lives in `./form`, never here.
export { Form, SchemaForm, useForm, withFieldGroup, withForm } from './form'

// Curated re-export of the consumer surface from the adapter, so a kit consumer never has
// to add `@ez-kit/form-react` as a second dependency. Deliberately not `export *`: the star
// would also export the kit-author contract types — `FormComponents`, the per-kind
// `*RenderProps` — whose home is `custom-kit.mdx`, and writing a kit means depending on the
// adapter directly. `createForm` itself is re-exported on purpose: calling it with the kit's
// components and an extended field set is the supported way to add a field kind, so the old
// reason for withholding it (that a differently-composed bundle must not be called "the HeroUI
// kit") no longer holds — what a consumer extends is still this kit's components.
export {
	clampToGridRange,
	createForm,
	createSchemaForm,
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
	BoundFieldComponent,
	CheckboxFieldProps,
	CheckboxGroupFieldProps,
	CustomFieldRegistry,
	CustomFieldRenderProps,
	FieldTypeDefinition,
	DateFieldProps,
	DateRangeFieldProps,
	DateRangeValue,
	FieldControlProps,
	FieldGroupInstance,
	FieldGroupOptions,
	FieldProps,
	FormBehaviourOptions,
	FormContextApi,
	FormControlledProps,
	FormFieldComponents,
	FormFieldRegistry,
	FormFieldSlots,
	FormGroupInstance,
	FormGroupProps,
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
	NoRegistry,
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
