import type { TextInputType } from './contract'
import type { DeepKeysOfType, SelectOption } from '@ez-kit/form-core'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

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

export type SelectFieldProps<TFormData> = BaseFieldProps<TFormData, string> & {
	options: readonly SelectOption[]
	placeholder?: string
}

export type CheckboxFieldProps<TFormData> = BaseFieldProps<TFormData, boolean>

/**
 * Props of `form.Form`. `onSubmit` is omitted deliberately: the wrapper owns it and routes
 * it to `form.handleSubmit()`, which is the whole point of the component.
 */
export type FormWrapperProps = Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> & {
	children: ReactNode
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
 */
export type FormFieldComponents<TFormData> = {
	TextField: (props: TextFieldProps<TFormData>) => ReactNode
	NumberField: (props: NumberFieldProps<TFormData>) => ReactNode
	TextareaField: (props: TextareaFieldProps<TFormData>) => ReactNode
	SelectField: (props: SelectFieldProps<TFormData>) => ReactNode
	CheckboxField: (props: CheckboxFieldProps<TFormData>) => ReactNode
	SubmitButton: (props: SubmitButtonProps) => ReactNode
	Form: (props: FormWrapperProps) => ReactNode
}
