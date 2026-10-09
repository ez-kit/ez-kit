export { useForm, Form, FormRenderer, withForm, withFieldGroup } from './form'

// The factory and the two bags it takes, so an app can call `createForm` itself with the
// kit's twelve field slots spread beside a field kind of its own. The ready-made bundle
// above stays the zero-config path; this is the extension one.
export {
	CheckboxField,
	CheckboxGroupField,
	DateField,
	DateRangeField,
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
// reason for withholding it (that a differently-composed bundle must not be called "the HeroUI
// kit") no longer holds — what a consumer extends is still this kit's components.
export {
	clampToGridRange,
	createForm,
	defineFieldType,
	FormFieldType,
	FormOptionSources,
	formatFieldErrors,
	GRID_MAX,
	GRID_MIN,
	hasFieldErrors,
	stripHiddenValues,
	TextInputType,
	useFieldGroup,
	useFormGroup,
} from '@ez-kit/form-react'
export type {
	AnyFormProps,
	BaseFieldProps,
	BlockRegistry,
	BoundForm,
	CheckboxFieldProps,
	CheckboxGroupFieldProps,
	CustomFieldRegistry,
	CustomFieldRenderProps,
	FieldTypeDefinition,
	DateFieldProps,
	DateRangeFieldProps,
	DateRangeValue,
	FormControlledProps,
	FormFieldComponents,
	FormFieldRegistry,
	FormFieldSlots,
	FormProps,
	FormRendererControlledProps,
	FormRendererUncontrolledProps,
	FormUncontrolledProps,
	GridItemProps,
	JsonValue,
	KitFormApi,
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
	OptionsSource,
	RadioGroupFieldProps,
	RendererForm,
	SearchableOptionSource,
	SectionProps,
	SelectFieldProps,
	SelectOption,
	SharedRendererProps,
	SimpleOptionSource,
	SliderFieldProps,
	SubmitButtonProps,
	SwitchFieldProps,
	TextareaFieldProps,
	TextFieldProps,
	Translate,
} from '@ez-kit/form-react'

// The schema-authoring half of the same surface. It lives in `@ez-kit/form-core` and is not
// re-exported by `@ez-kit/form-react`, so the kit takes a direct dependency on core to keep
// the "one dependency" claim above true for config-driven forms as well: under pnpm's strict
// `node_modules` layout a transitive dependency is not importable, so every import the docs
// tell a reader to copy has to resolve from the kit itself.
export {
	buildValidator,
	defineFormSchema,
	FormSchemaError,
	isFieldNode,
	parseFormSchema,
	RESERVED_NODE_TYPES,
	resolveText,
	visibleFieldNames,
	walkNodes,
} from '@ez-kit/form-core'
export type {
	AnyFormSchema,
	BlockNode,
	Condition,
	CustomFieldNode,
	FieldNode,
	FieldRef,
	FieldValidate,
	FormNode,
	FormSchema,
	NamedRule,
	ParseOptions,
	Rule,
	SectionNode,
	StepNode,
	SubmitNode,
} from '@ez-kit/form-core'
