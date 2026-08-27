import type { FormFieldType } from './field-types'
import type { LocalizedText } from './localized-text'
import type { Condition } from './rules'
import type { SelectOption } from './select-option'
import type { TextInputType } from './text-input-type'
import type { DeepKeys, DeepKeysOfType } from '@tanstack/form-core'

/** Container `type` values, plus the two value-less leaves. Never usable as registry keys. */
export const RESERVED_NODE_TYPES = ['section', 'step', 'submit', 'block'] as const

type CommonProps<TValues> = {
	label?: LocalizedText
	description?: LocalizedText
	when?: Condition<TValues>
	disabledWhen?: Condition<TValues>
	/** Grid columns this node spans inside its section. Default 1. Must be an integer 1..4. */
	colSpan?: number
}

/**
 * Per-field validation, layered on top of whatever the TanStack Form validator adapter
 * already does. Declared here (not in a `validate.ts`) because that module does not exist
 * yet — a later task owns compiling this into a validator and will import the type from
 * `./schema`.
 */
export type FieldValidate = {
	required?: boolean
	min?: number
	max?: number
	minLength?: number
	maxLength?: number
	format?: 'email' | 'url' | 'tel'
	rule?: string
	messages?: Partial<Record<string, LocalizedText>>
}

type FieldCommon<TValues> = CommonProps<TValues> & {
	required?: boolean
	validate?: FieldValidate
}

export type FieldNode<TValues> =
	| (FieldCommon<TValues> & {
			type: FormFieldType.Text
			name: DeepKeysOfType<TValues, string>
			defaultValue?: string
			placeholder?: string
			inputType?: TextInputType
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Number
			name: DeepKeysOfType<TValues, number>
			defaultValue?: number
			placeholder?: string
			min?: number
			max?: number
			step?: number
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Textarea
			name: DeepKeysOfType<TValues, string>
			defaultValue?: string
			placeholder?: string
			rows?: number
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Select
			name: DeepKeysOfType<TValues, string>
			defaultValue?: string
			options: readonly SelectOption[]
			placeholder?: string
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Checkbox
			name: DeepKeysOfType<TValues, boolean>
			defaultValue?: boolean
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Switch
			name: DeepKeysOfType<TValues, boolean>
			defaultValue?: boolean
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.RadioGroup
			name: DeepKeysOfType<TValues, string>
			defaultValue?: string
			options: readonly SelectOption[]
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Slider
			name: DeepKeysOfType<TValues, number>
			defaultValue?: number
			min?: number
			max?: number
			step?: number
	  })

export type SectionNode<TValues, TCustom extends string = never> = CommonProps<TValues> & {
	type: 'section'
	title?: LocalizedText
	description?: LocalizedText
	/** Grid columns for direct children. Default 1. Must be an integer 1..4. */
	columns?: number
	children: FormNode<TValues, TCustom>[]
}

export type StepNode<TValues, TCustom extends string = never> = CommonProps<TValues> & {
	type: 'step'
	title?: LocalizedText
	description?: LocalizedText
	/** Opt-in data path; enables TanStack's `useFormGroup` for this step (spec §4.5). */
	path?: string
	children: FormNode<TValues, TCustom>[]
}

export type SubmitNode<TValues> = CommonProps<TValues> & { type: 'submit'; disabled?: boolean }

export type BlockNode<TValues> = CommonProps<TValues> & {
	type: 'block'
	component: string
	props?: Record<string, unknown>
}

/**
 * A field kind supplied through the registry. `name` cannot be narrowed by value type — a
 * custom field's value shape is unknown to `FormSchema`, so `name` only narrows to a real
 * data path.
 *
 * `TCustom` is the closed set of custom type keys the author registered via
 * `defineFormSchema<TValues, TCustom>()`; it defaults to `never`, which removes this member
 * from `FormNode` entirely for schemas that declare no custom fields. That is also what keeps
 * a mistyped built-in node (right `type`, wrong-value-typed `name`) a compile error instead of
 * silently matching this catch-all — see `schema-types.test.ts`.
 */
export type CustomFieldNode<TValues, TCustom extends string = never> = FieldCommon<TValues> & {
	type: TCustom
	name: DeepKeys<TValues>
	defaultValue?: unknown
	props?: Record<string, unknown>
}

export type FormNode<TValues, TCustom extends string = never> =
	| FieldNode<TValues>
	| SectionNode<TValues, TCustom>
	| StepNode<TValues, TCustom>
	| SubmitNode<TValues>
	| BlockNode<TValues>
	| CustomFieldNode<TValues, TCustom>

export type FormSchema<TValues, TCustom extends string = never> = {
	version: 1
	children: FormNode<TValues, TCustom>[]
}

/**
 * Accepts a schema regardless of which custom type keys it was authored with — for modules
 * (traversal, the parser, the renderer, …) that consume an already-built schema rather than
 * author one. Both `FormSchema<TValues, never>` and `FormSchema<TValues, 'rating'>` are
 * assignable to it.
 */
export type AnyFormSchema<TValues> = FormSchema<TValues, string>

/**
 * Curried on purpose: TypeScript has no partial generic inference, so `TValues` (and the
 * optional `TCustom` set of custom field-type keys) are given explicitly while the schema
 * literal is still inferred — which is what makes `name` checkable per field kind.
 */
export function defineFormSchema<TValues, TCustom extends string = never>() {
	return <const S extends FormSchema<TValues, TCustom>>(schema: S): S => schema
}
