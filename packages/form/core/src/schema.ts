import type { DateRangeValue } from './date-value'
import type { FormFieldType } from './field-types'
import type { LocalizedText } from './localized-text'
import type { OptionsSource } from './options-source'
import type { Condition } from './rules'
import type { LocalizedSelectOption } from './select-option'
import type { TextInputType } from './text-input-type'
import type { DeepKeys, DeepKeysOfType } from '@tanstack/form-core'

/** Container `type` values, plus the two value-less leaves. Never usable as registry keys. */
export const RESERVED_NODE_TYPES = ['section', 'step', 'submit', 'block'] as const

/**
 * The supported range for `SectionNode.columns` and any node's `colSpan` — part of the v1
 * format, not a kit detail, so it is defined once here and consumed by both `parseFormSchema`
 * (which rejects a document outside this range) and the kits (which clamp into it for a
 * TS-authored schema that bypassed `parseFormSchema`).
 */
export const GRID_MIN = 1
export const GRID_MAX = 4

/** Rounds to the nearest integer, then clamps into `[GRID_MIN, GRID_MAX]`. */
export function clampToGridRange(value: number): number {
	return Math.min(GRID_MAX, Math.max(GRID_MIN, Math.round(value)))
}

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
	/**
	 * A numeric bound for a number field, or a `YYYY-MM-DD` bound for a date one — ISO
	 * calendar dates sort lexicographically, so one constraint covers both without a
	 * date-only spelling a backend would have to learn separately.
	 */
	min?: number | string
	max?: number | string
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

/**
 * The four select-like kinds, each generated once per option-value scalar (`string`,
 * `number`) instead of being written once with a `string | number` value.
 *
 * That is what keeps `name` and `options` **correlated**: a field bound to a numeric path
 * must be given numeric options, and one bound to a string path string options — a mixture
 * is a compile error rather than a runtime lookup that silently finds nothing. Writing the
 * members once with a widened value type would type-check both halves independently and lose
 * exactly that guarantee. See `schema-types.test.ts`.
 *
 * There is no new node `type` for the numeric flavour: `select<string>` and `select<number>`
 * are the same widget with the same value shape, and only the JSON scalar differs (unlike
 * `date` vs `daterange`, where both the shape and the widget differ).
 */
/**
 * Where a select-like member's choices come from: written into the document, or named.
 *
 * A two-arm union, not two optional keys, so "exactly one of the two" is a compile error
 * rather than a runtime discovery — `parseFormSchema` enforces the same rule for a document
 * that never went through TypeScript. The `?: never` arms are what make each side reject the
 * other's key; the same spelling `FormRendererUncontrolledProps` uses for its `form?: never`.
 *
 * `optionsFrom: 'cities'` is sugar for `optionsFrom: { source: 'cities' }` — the bare-string
 * spelling is the common case (no parameters, no dependencies) and reads better in JSON.
 */
type OptionsProvision<TValue> =
	| { options: readonly LocalizedSelectOption<TValue>[]; optionsFrom?: never }
	| { options?: never; optionsFrom: string | OptionsSource }

type SelectMember<TValues, TValue> = FieldCommon<TValues> &
	OptionsProvision<TValue> & {
		type: FormFieldType.Select
		name: DeepKeysOfType<TValues, TValue>
		defaultValue?: TValue
		placeholder?: string
		/**
		 * Render this select as a search box over its options rather than a plain dropdown.
		 *
		 * A flag, not a new node `type`: the value and its shape are unchanged and only the
		 * presentation differs — the same reasoning that kept the numeric option flavour on
		 * `select` instead of spawning a `numberselect`.
		 *
		 * It is only meaningful together with `optionsFrom`, and only with a source that
		 * supplies `useSelectedOptions` (see `SearchableOptionSource` in `@ez-kit/form-react`):
		 * a server-side search returns just the page matching the last query, so the option
		 * carrying the value already in form state is usually absent and has to be fetched
		 * separately for its label. The renderer throws, naming the field, when a `searchable`
		 * field has a static `options` list or a source that cannot resolve a selection.
		 *
		 * Deliberately absent from `radiogroup` and `checkboxgroup` — they render every option
		 * inline, so there is nothing to search — and from `multiselect`, where it is not
		 * supported *yet*: N selected values need chips carrying N resolved labels.
		 * `parseFormSchema` rejects it on all three.
		 */
		searchable?: boolean
	}

type MultiSelectMember<TValues, TValue> = FieldCommon<TValues> &
	OptionsProvision<TValue> & {
		type: FormFieldType.MultiSelect
		name: DeepKeysOfType<TValues, TValue[]>
		defaultValue?: readonly TValue[]
		placeholder?: string
	}

type CheckboxGroupMember<TValues, TValue> = FieldCommon<TValues> &
	OptionsProvision<TValue> & {
		type: FormFieldType.CheckboxGroup
		name: DeepKeysOfType<TValues, TValue[]>
		defaultValue?: readonly TValue[]
	}

type RadioGroupMember<TValues, TValue> = FieldCommon<TValues> &
	OptionsProvision<TValue> & {
		type: FormFieldType.RadioGroup
		name: DeepKeysOfType<TValues, TValue>
		defaultValue?: TValue
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
	| SelectMember<TValues, string>
	| SelectMember<TValues, number>
	| MultiSelectMember<TValues, string>
	| MultiSelectMember<TValues, number>
	| CheckboxGroupMember<TValues, string>
	| CheckboxGroupMember<TValues, number>
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
	| RadioGroupMember<TValues, string>
	| RadioGroupMember<TValues, number>
	| (FieldCommon<TValues> & {
			type: FormFieldType.Date
			name: DeepKeysOfType<TValues, string>
			/** `YYYY-MM-DD`. */
			defaultValue?: string
			placeholder?: string
			/** Earliest selectable day, `YYYY-MM-DD` — the picker's own bound, not a check. */
			min?: string
			/** Latest selectable day, `YYYY-MM-DD`. */
			max?: string
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.DateRange
			name: DeepKeysOfType<TValues, DateRangeValue>
			defaultValue?: DateRangeValue
			placeholder?: string
			min?: string
			max?: string
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
