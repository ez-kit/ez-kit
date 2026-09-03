export { useForm, Form, FormRenderer, withForm, withFieldGroup } from './form'

// Curated re-export of the consumer surface from the adapter, so a kit consumer never has
// to add `@ez-kit/form-react` as a second dependency. Deliberately not `export *`: the star
// would also re-export the unbound `createForm`, which a consumer must not call with a
// different component set and still call "the shadcn kit". For the same reason the kit-author
// contract (`FormComponents`, the per-kind `*RenderProps`) stays out — writing a kit means
// depending on the adapter directly, which `custom-kit.mdx` already says.
export {
	clampToGridRange,
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
	DateFieldProps,
	DateRangeFieldProps,
	DateRangeValue,
	FormControlledProps,
	FormFieldComponents,
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
