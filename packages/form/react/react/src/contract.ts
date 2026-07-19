import type { SelectOption } from '@ez-kit/form-core'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * The UI-kit contract.
 *
 * This package renders **no visuals of its own** — every visible element is supplied by a
 * kit through {@link FormComponents} and injected at `createForm({ components })` time.
 * The wrappers here only compose those primitives, wire them to TanStack Form state, and
 * add `data-*` attributes for kit CSS to target.
 *
 * Both `@ez-kit/form-shadcn` and `@ez-kit/form-heroui` implement this identical interface,
 * which is what lets one example render under either kit. Register a kit with
 * `satisfies FormComponents` so a forgotten primitive is a compile error rather than a
 * runtime crash.
 */

/** The `type` attribute a text input may carry — a closed set, never a bare string. */
export enum TextInputType {
	Text = 'text',
	Email = 'email',
	Password = 'password',
	Tel = 'tel',
	Url = 'url',
	Search = 'search',
}

// ── field chrome ─────────────────────────────────────────────────────────────

/**
 * The per-field wrapper element. Receives the `data-field`, `data-field-type` and
 * `data-invalid` attributes, so kit CSS can style a field by name, kind or validity.
 */
export type FieldRootProps = ComponentPropsWithoutRef<'div'>

export type LabelProps = {
	/** Always the input's `id`, so clicking the label focuses the control. */
	htmlFor: string
	/** Referenced from the input's `aria-labelledby`; kits must render it. */
	id: string
	children: ReactNode
}

export type DescriptionProps = {
	/** Referenced from the input's `aria-describedby`. */
	id: string
	children: ReactNode
}

export type ErrorTextProps = {
	/** Referenced from the input's `aria-describedby`. */
	id: string
	/** Already normalised to display strings by `formatFieldErrors`; never empty when rendered. */
	errors: string[]
}

// ── inputs ───────────────────────────────────────────────────────────────────

/** What every injected input receives, whatever its value type. */
export type BaseInputProps = {
	id: string
	name: string
	onBlur: () => void
	disabled?: boolean
	required?: boolean
	/** Drives the kit's invalid styling; the wrapper also sets `aria-invalid`. */
	invalid?: boolean
	/**
	 * Explicitly nullable: under `exactOptionalPropertyTypes` the wrapper passes the key
	 * unconditionally, and a field with neither description nor error has nothing to point at.
	 */
	'aria-describedby'?: string | undefined
	/**
	 * Points at the field's label element. A native `<label for>` covers simple inputs, but
	 * composite widgets — a React Aria select trigger, a number-field group — are not
	 * labelled by it and need the explicit reference.
	 */
	'aria-labelledby'?: string | undefined
}

export type TextInputProps = BaseInputProps & {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	type?: TextInputType
}

export type NumberInputProps = BaseInputProps & {
	/**
	 * `undefined` while the control is empty — an empty numeric input is genuinely
	 * "no number", which `NaN` would model far worse.
	 */
	value: number | undefined
	onChange: (value: number | undefined) => void
	placeholder?: string
	min?: number
	max?: number
	step?: number
}

export type TextareaProps = BaseInputProps & {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	rows?: number
}

export type SelectProps = BaseInputProps & {
	value: string
	onChange: (value: string) => void
	options: readonly SelectOption[]
	placeholder?: string
}

export type CheckboxProps = BaseInputProps & {
	checked: boolean
	onChange: (checked: boolean) => void
}

// ── form level ───────────────────────────────────────────────────────────────

export type ButtonProps = {
	type?: 'submit' | 'button'
	disabled?: boolean
	children: ReactNode
}

export type FormElementProps = ComponentPropsWithoutRef<'form'>

// ── the contract itself ──────────────────────────────────────────────────────

/**
 * Every primitive a kit must supply. A kit registers one object literal covering all of
 * them; there is no partial tier in v1 because every field is part of the base set.
 */
export type FormComponents = {
	// chrome
	FieldRoot: (props: FieldRootProps) => ReactNode
	Label: (props: LabelProps) => ReactNode
	Description: (props: DescriptionProps) => ReactNode
	ErrorText: (props: ErrorTextProps) => ReactNode
	// inputs
	TextInput: (props: TextInputProps) => ReactNode
	NumberInput: (props: NumberInputProps) => ReactNode
	Textarea: (props: TextareaProps) => ReactNode
	Select: (props: SelectProps) => ReactNode
	Checkbox: (props: CheckboxProps) => ReactNode
	// form level
	Button: (props: ButtonProps) => ReactNode
	Form: (props: FormElementProps) => ReactNode
}
