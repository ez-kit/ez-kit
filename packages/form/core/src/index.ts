export { collectRuleFields, compileCondition, getValueAtPath } from './rules'
export { FormFieldType, FORM_FIELD_TYPES } from './field-types'
export { formatFieldErrors, hasFieldErrors } from './errors'
export { resolveText } from './localized-text'
export { defineFormSchema, RESERVED_NODE_TYPES } from './schema'
export { isFieldNode, walkNodes } from './walk'

export type { Condition, FieldRef, Rule } from './rules'
export type { SelectOption } from './select-option'
export type { LocalizedText, Translate } from './localized-text'
export type {
	AnyFormSchema,
	BlockNode,
	CustomFieldNode,
	FieldNode,
	FieldValidate,
	FormNode,
	FormSchema,
	SectionNode,
	StepNode,
	SubmitNode,
} from './schema'

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
