export { collectRuleFields, compileCondition, getValueAtPath, setValueAtPath } from './rules'
export { FormFieldType, FORM_FIELD_TYPES } from './field-types'
export { formatFieldErrors, hasFieldErrors } from './errors'
export { isDateRangeValue, isIsoDate } from './date-value'
export { resolveText } from './localized-text'
export { resolveSelectOptions } from './select-option'
export { FormSchemaError, parseFormSchema } from './parse'
export { clampToGridRange, defineFormSchema, GRID_MAX, GRID_MIN, RESERVED_NODE_TYPES } from './schema'
export { TextInputType } from './text-input-type'
export { buildValidator } from './validate'
export { isFieldNode, walkNodes } from './walk'
export { stripHiddenValues, visibleFieldNames } from './visibility'

export type { DateRangeValue } from './date-value'
export type { Condition, FieldRef, Rule } from './rules'
export type { LocalizedSelectOption, SelectOption } from './select-option'
export type { LocalizedText, Translate } from './localized-text'
export type { ParseOptions } from './parse'
export type {
	AnyFormSchema,
	BlockNode,
	CustomFieldNode,
	FieldNode,
	FormNode,
	FormSchema,
	SectionNode,
	StepNode,
	SubmitNode,
} from './schema'
export type { FieldValidate, NamedRule } from './validate'

/**
 * Curated re-exports of the framework-agnostic TanStack Form types the kits and the
 * React adapter build on. Re-exported here so downstream packages depend on
 * `@ez-kit/form-core` rather than reaching into `@tanstack/form-core` directly.
 */
export type {
	AnyFieldApi,
	AnyFormApi,
	AnyFormOptions,
	DeepKeysOfType,
	FormAsyncValidateOrFn,
	FormOptions,
	FormState,
	FormValidateOrFn,
	StandardSchemaV1,
} from '@tanstack/form-core'
