import type { FormFieldType, SelectOption } from '@ez-kit/form-core'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * The UI-kit contract.
 *
 * This package renders **no visuals of its own** and — deliberately — no DOM structure
 * either. It binds TanStack Form state, normalises errors, and hands one flat props object
 * per field to the kit; the kit owns the entire element tree of that field, label and
 * description and error text included.
 *
 * That inversion is what makes React-Aria-based kits work. HeroUI v3 fields are *contexts*:
 * `<Label>`, `<Description>` and `<FieldError>` must be **children** of `<TextField>` to
 * pick up ids, `aria-describedby` and validation state. A shared wrapper that rendered them
 * as siblings could only ever fake that wiring. shadcn has the opposite shape — plain
 * siblings in a grid — and both now express their natural anatomy without fighting a
 * one-size layout.
 *
 * Both `@ez-kit/form-shadcn` and `@ez-kit/form-heroui` implement this identical interface,
 * which is what lets one example render under either kit. Register a kit with
 * `satisfies FormComponents` so a forgotten field is a compile error rather than a runtime
 * crash.
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

/**
 * What every field receives, whatever its value type.
 *
 * Optional consumer inputs (`label`, `description`, `disabled`, `required`, …) are declared
 * as `T | undefined` rather than `?:` on purpose: under `exactOptionalPropertyTypes` the
 * binding layer would otherwise have to spread each key conditionally, and a kit could not
 * tell "absent" from "explicitly nothing". A kit that forwards these to a library which
 * rejects an explicit `undefined` (React Aria, Radix) spreads conditionally at *its* edge,
 * where the constraint actually lives.
 */
export type FieldRenderProps = {
	/** The field's `name`. Kits spread it onto their root so CSS and tests can find the field. */
	'data-field': string
	/** Which kind of field this is; also spread onto the kit's root. */
	'data-field-type': FormFieldType
	/**
	 * The DOM id the kit must put on the focusable control, so `data-field` lookups and a
	 * `<label for>` agree. React-Aria kits still let the library own its internal wiring —
	 * this only pins the control's own id.
	 */
	id: string
	name: string
	label: ReactNode
	description: ReactNode
	/**
	 * Display strings, already normalised by `formatFieldErrors`. Empty while the field is
	 * valid — kits render their error element only when it is not.
	 */
	errors: string[]
	/** `errors.length > 0`, precomputed because every kit needs it as a boolean prop. */
	invalid: boolean
	onBlur: () => void
	disabled: boolean | undefined
	required: boolean | undefined
}

export type TextFieldRenderProps = FieldRenderProps & {
	value: string
	onChange: (value: string) => void
	placeholder: string | undefined
	type: TextInputType | undefined
}

export type NumberFieldRenderProps = FieldRenderProps & {
	/**
	 * `undefined` while the control is empty — an empty numeric input is genuinely
	 * "no number", which `NaN` would model far worse.
	 */
	value: number | undefined
	onChange: (value: number | undefined) => void
	placeholder: string | undefined
	min: number | undefined
	max: number | undefined
	step: number | undefined
}

export type TextareaFieldRenderProps = FieldRenderProps & {
	value: string
	onChange: (value: string) => void
	placeholder: string | undefined
	rows: number | undefined
}

export type SelectFieldRenderProps = FieldRenderProps & {
	value: string
	onChange: (value: string) => void
	options: readonly SelectOption[]
	placeholder: string | undefined
}

export type CheckboxFieldRenderProps = FieldRenderProps & {
	checked: boolean
	onChange: (checked: boolean) => void
}

export type SwitchFieldRenderProps = FieldRenderProps & {
	checked: boolean
	onChange: (checked: boolean) => void
}

export type RadioGroupFieldRenderProps = FieldRenderProps & {
	value: string
	onChange: (value: string) => void
	options: readonly SelectOption[]
}

export type SliderFieldRenderProps = FieldRenderProps & {
	/**
	 * A slider always sits at a concrete point on its track, so — unlike a numeric text input —
	 * an empty form value is coerced to a real number by the binding layer rather than passed
	 * through as `undefined`.
	 */
	value: number
	onChange: (value: number) => void
	min: number | undefined
	max: number | undefined
	step: number | undefined
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
 * Every component a kit must supply — one per field kind, plus the two form-level pieces.
 * There is no partial tier in v1 because every field is part of the base set.
 */
export type FormComponents = {
	TextField: (props: TextFieldRenderProps) => ReactNode
	NumberField: (props: NumberFieldRenderProps) => ReactNode
	TextareaField: (props: TextareaFieldRenderProps) => ReactNode
	SelectField: (props: SelectFieldRenderProps) => ReactNode
	CheckboxField: (props: CheckboxFieldRenderProps) => ReactNode
	SwitchField: (props: SwitchFieldRenderProps) => ReactNode
	RadioGroupField: (props: RadioGroupFieldRenderProps) => ReactNode
	SliderField: (props: SliderFieldRenderProps) => ReactNode
	Button: (props: ButtonProps) => ReactNode
	Form: (props: FormElementProps) => ReactNode
}
