export { FormFieldType, FORM_FIELD_TYPES } from './field-types'
export { formatFieldErrors, hasFieldErrors } from './errors'

export type { SelectOption } from './select-option'

/**
 * Curated re-exports of the framework-agnostic TanStack Form types the kits and the
 * React adapter build on. Re-exported here so downstream packages depend on
 * `@ez-kit/form-core` rather than reaching into `@tanstack/form-core` directly.
 */
export type { AnyFieldApi, AnyFormApi, FormState, FormValidateOrFn, StandardSchemaV1 } from '@tanstack/form-core'
