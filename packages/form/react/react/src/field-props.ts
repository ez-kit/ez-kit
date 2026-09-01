import type { DateRangeValue, DeepKeysOfType, SelectOption, TextInputType } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * Consumer-facing props of the flat field components (`form.TextField`, …).
 *
 * `name` is narrowed to the paths in `TFormData` whose value type matches the field —
 * `form.NumberField name="email"` is a compile error, not a runtime surprise.
 */
export type BaseFieldProps<TFormData, TValue> = {
	name: DeepKeysOfType<TFormData, TValue>
	label?: ReactNode
	description?: ReactNode
	disabled?: boolean
	required?: boolean
}

export type TextFieldProps<TFormData> = BaseFieldProps<TFormData, string> & {
	placeholder?: string
	type?: TextInputType
}

export type NumberFieldProps<TFormData> = BaseFieldProps<TFormData, number> & {
	placeholder?: string
	min?: number
	max?: number
	step?: number
}

export type TextareaFieldProps<TFormData> = BaseFieldProps<TFormData, string> & {
	placeholder?: string
	rows?: number
}

/**
 * The select-like props, generated once per option-value scalar and unioned — the same split
 * `FieldNode`'s `SelectMember` / `MultiSelectMember` / … make in `@ez-kit/form-core`, and for
 * the same reason: it keeps `name` and `options` **correlated**, so
 * `<form.SelectField name='countryId' options={[{ label: 'DE', value: 'de' }]} />` is a
 * compile error when `countryId` is a number. One widened `string | number` value type would
 * check the two halves independently and lose exactly that.
 */
type SelectFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue> & {
	options: readonly SelectOption<TValue>[]
	placeholder?: string
}

export type SelectFieldProps<TFormData> =
	| SelectFieldPropsFor<TFormData, string>
	| SelectFieldPropsFor<TFormData, number>

type MultiSelectFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue[]> & {
	options: readonly SelectOption<TValue>[]
	placeholder?: string
}

export type MultiSelectFieldProps<TFormData> =
	| MultiSelectFieldPropsFor<TFormData, string>
	| MultiSelectFieldPropsFor<TFormData, number>

type CheckboxGroupFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue[]> & {
	options: readonly SelectOption<TValue>[]
}

export type CheckboxGroupFieldProps<TFormData> =
	| CheckboxGroupFieldPropsFor<TFormData, string>
	| CheckboxGroupFieldPropsFor<TFormData, number>

export type CheckboxFieldProps<TFormData> = BaseFieldProps<TFormData, boolean>

export type SwitchFieldProps<TFormData> = BaseFieldProps<TFormData, boolean>

type RadioGroupFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue> & {
	options: readonly SelectOption<TValue>[]
}

export type RadioGroupFieldProps<TFormData> =
	| RadioGroupFieldPropsFor<TFormData, string>
	| RadioGroupFieldPropsFor<TFormData, number>

/** `min` / `max` are `YYYY-MM-DD` bounds on what the picker offers, not validation. */
export type DateFieldProps<TFormData> = BaseFieldProps<TFormData, string> & {
	placeholder?: string
	min?: string
	max?: string
}

export type DateRangeFieldProps<TFormData> = BaseFieldProps<TFormData, DateRangeValue> & {
	placeholder?: string
	min?: string
	max?: string
}

export type SliderFieldProps<TFormData> = BaseFieldProps<TFormData, number> & {
	min?: number
	max?: number
	step?: number
}

export type SubmitButtonProps = {
	children: ReactNode
	/** Forced-disabled regardless of form state; the form's own state can only add to this. */
	disabled?: boolean
}

/**
 * The flat components attached to the form instance by `createForm`. They sit alongside —
 * never in place of — the native TanStack Form API (`Field`, `Subscribe`, `handleSubmit`,
 * `state`, `AppField`, …), which stays fully available on the same object.
 *
 * The `<form>` element is not among them: it lives in the standalone `<Form>` component,
 * which is the single place that renders it in either mode.
 */
export type FormFieldComponents<TFormData> = {
	TextField: (props: TextFieldProps<TFormData>) => ReactNode
	NumberField: (props: NumberFieldProps<TFormData>) => ReactNode
	TextareaField: (props: TextareaFieldProps<TFormData>) => ReactNode
	SelectField: (props: SelectFieldProps<TFormData>) => ReactNode
	CheckboxField: (props: CheckboxFieldProps<TFormData>) => ReactNode
	SwitchField: (props: SwitchFieldProps<TFormData>) => ReactNode
	RadioGroupField: (props: RadioGroupFieldProps<TFormData>) => ReactNode
	SliderField: (props: SliderFieldProps<TFormData>) => ReactNode
	MultiSelectField: (props: MultiSelectFieldProps<TFormData>) => ReactNode
	CheckboxGroupField: (props: CheckboxGroupFieldProps<TFormData>) => ReactNode
	DateField: (props: DateFieldProps<TFormData>) => ReactNode
	DateRangeField: (props: DateRangeFieldProps<TFormData>) => ReactNode
	SubmitButton: (props: SubmitButtonProps) => ReactNode
}
