export { createForm } from './create-form'
export { defineFieldType } from './field-registry'
export { FormProvider, useFormContext } from './form-context'
export { FormOptionSources } from './options/source-context'

export type { CreateFormOptions, FormBundle } from './create-form'
export type { FieldTypeDefinition, FormFieldRegistry } from './field-registry'
export type { KitFormBlock, KitWithFormProps } from './composition'
export type { FieldValidateProps } from './field-validate'
export type { AnyFormInstance, FormContextApi } from './form-context'
export type { FormInstance } from './form-instance'
export type { AnyFormProps, FormControlledProps, FormProps, FormUncontrolledProps } from './form-props'
export type {
	SchemaFormControlledProps,
	SchemaFormUncontrolledProps,
	SharedSchemaFormProps,
} from './schema/schema-form'
export type { BlockRegistry, CustomFieldRegistry, CustomFieldRenderProps } from './schema/registries'
export type {
	OptionSource,
	OptionSourceRegistry,
	SearchableOptionSource,
	SimpleOptionSource,
} from './options/source-types'
export type {
	AllFormComponents,
	AllFormFieldSlots,
	ArrayFieldRenderProps,
	ArrayFieldSlot,
	ArrayItemRenderProps,
	CheckboxFieldRenderProps,
	CheckboxGroupFieldRenderProps,
	DateFieldRenderProps,
	DateRangeFieldRenderProps,
	FieldRenderProps,
	FormComponentRegistry,
	FormComponents,
	FormElementProps,
	FormFieldSlots,
	MultiSelectFieldRenderProps,
	NoRegistry,
	NumberFieldRenderProps,
	RadioGroupFieldRenderProps,
	SelectFieldRenderProps,
	SliderFieldRenderProps,
	SwitchFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
	WizardRenderProps,
	WizardStep,
} from './contract'
export type {
	ArrayFieldProps,
	ArrayFieldScope,
	ArrayItemProps,
	ArrayItemScope,
	ArrayProps,
	ArrayScope,
	BaseFieldProps,
	CheckboxFieldProps,
	CheckboxGroupFieldProps,
	DateFieldProps,
	DateRangeFieldProps,
	GridItemProps,
	MultiSelectFieldProps,
	FormFieldComponents,
	FormPrimitives,
	NumberFieldProps,
	RadioGroupFieldProps,
	SectionProps,
	SelectFieldProps,
	SliderFieldProps,
	SubmitButtonProps,
	SubmitProps,
	SubmitRenderProps,
	SwitchFieldProps,
	TextareaFieldProps,
	TextFieldProps,
} from './field-props'

// Re-exported so a kit depends on `@ez-kit/form-react` alone rather than also pulling in
// `@ez-kit/form-core` for the option shape its `Select` renders, or — for `GRID_MIN`/`GRID_MAX`/
// `clampToGridRange` — for the numeric range `columns`/`colSpan` share with `parseFormSchema`.
// `stripHiddenValues` is here for the same reason, aimed at one specific caller: a controlled
// `SchemaForm` cannot strip hidden values on a caller's behalf (see the doc comment on
// `SchemaFormControlledProps`), so the caller applies it themselves inside their own
// `onSubmit` — that only works without a second dependency if it is reachable from here.
export {
	clampToGridRange,
	FormFieldType,
	formatFieldErrors,
	GRID_MAX,
	GRID_MIN,
	hasFieldErrors,
	stripHiddenValues,
	TextInputType,
} from '@ez-kit/form-core'
export type {
	DateRangeValue,
	JsonValue,
	LocalizedSelectOption,
	LocalizedText,
	OptionSourceInput,
	OptionSourceRef,
	OptionSourceResult,
	SelectOption,
	Translate,
} from '@ez-kit/form-core'

// The schema-authoring half of the surface, so a kit depends on `@ez-kit/form-react` alone (spec
// 009, D9). Under pnpm's strict layout a transitive dependency is not importable, so every name the
// docs tell a reader to import from their kit has to be re-exported on this path.
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
	walkNodes,
} from '@ez-kit/form-core'
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
} from '@ez-kit/form-core'

// Spec §12: the group hooks are re-exported verbatim — they yield a group API, which
// correctly carries no injected field components, so unlike `withForm` they need no
// retyping. Inside a group the fields are written with the native `form.Field` / `AppField`.
// `useSelector` is re-exported so an app reads the form's store through the same TanStack copy the
// form uses and never installs TanStack itself — a second copy would be a second store, and this
// package owns the version.
export { useFieldGroup, useFormGroup, useSelector } from '@tanstack/react-form'
