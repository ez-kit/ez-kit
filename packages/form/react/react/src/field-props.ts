import type { DateRangeValue, DeepKeysOfType, LocalizedText, SelectOption, TextInputType } from '@ez-kit/form-core'
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
/**
 * What every option-bearing field accepts on top of {@link BaseFieldProps}.
 *
 * **Exactly one of `options` and `optionsFrom` must be given** — both, or neither, throws with
 * the field's name when it renders. Deliberately not expressed as a union: these props are
 * *already* a union over the string/number option-value split (see the note above), and a
 * second two-arm union would multiply into four arms in which `name` could no longer be
 * checked against `options` per arm — losing the correlation that split exists for. The
 * schema side has no such conflict and does state it in the types (`OptionsProvision` in
 * `@ez-kit/form-core`), and `parseFormSchema` enforces it for a delivered document.
 *
 * `loading` belongs to the `options` half: it is how an app that fetches its own options tells
 * the kit that an empty list is "not here yet" rather than "there is nothing to choose from" —
 * `<form.SelectField name='role' options={data ?? []} loading={isPending} />`. Omitted, it is
 * `false`. With `optionsFrom` it is not yours to pass: the source reports its own `loading`,
 * which flows into the same contract key.
 */
type OptionsProps<TValue> = {
	options?: readonly SelectOption<TValue>[]
	loading?: boolean
	/**
	 * The name of a source registered on `<FormOptionSources>` — the JSX spelling of the
	 * schema's `optionsFrom`. The source is a hook, so it may be any query the app already
	 * has; see {@link OptionSource}.
	 */
	optionsFrom?: string
	/**
	 * The arguments handed to that source. Compared **by value**, so an inline literal is
	 * fine — `optionsParams={{ country }}` re-created every render changes nothing until
	 * `country` itself does.
	 *
	 * This is the live-value counterpart of the schema's `dependsOn`: JSON cannot hold a live
	 * value, so a document names the path to read; here you pass the value straight in. Both
	 * paths produce the identical object.
	 */
	optionsParams?: Record<string, unknown>
}

/**
 * Offer the typed text as an extra option when it matches nothing, so a value the list does
 * not contain can still be chosen — the JSX spelling of the schema's `creatable`.
 *
 * Requires `searchable`: a value is created by typing it, and only a searchable field has an
 * input to type into. That is a runtime throw naming the field, like the `searchable`
 * requirements themselves are.
 *
 * **String-valued lists only**, which is what the conditional does — on the numeric arm the
 * two keys are `never`, so `creatable` there is a compile error. The typed text is a string,
 * and a numeric-valued field would have to invent an id no backend issued.
 *
 * `createLabel` captions the offered row. It defaults to `Add "<query>"`; a plain string is
 * used verbatim, and the `{ key, params }` form gets the typed text merged in under `query`
 * so a translation may place it.
 */
type CreatableProps<TValue> = [TValue] extends [string]
	? { creatable?: boolean; createLabel?: LocalizedText }
	: { creatable?: false; createLabel?: never }

type SelectFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue> &
	OptionsProps<TValue> & {
		placeholder?: string
		/**
		 * Render as a search over the options rather than a plain dropdown — the JSX spelling of
		 * the schema's `searchable`.
		 *
		 * Requires `optionsFrom`, and a source in the two-hook form (`useOptions` +
		 * `useSelectedOptions`); both are runtime throws naming the field, for the same reason
		 * the `options`/`optionsFrom` exclusion is. A server-side search returns only the page
		 * matching the last query, so the option for the value already in form state has to be
		 * fetched separately — see {@link SearchableOptionSource}.
		 *
		 * `select` and `multiselect` only; the two inline kinds do not have the prop at all.
		 */
		searchable?: boolean
	} & CreatableProps<TValue>

export type SelectFieldProps<TFormData> =
	| SelectFieldPropsFor<TFormData, string>
	| SelectFieldPropsFor<TFormData, number>

type MultiSelectFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue[]> &
	OptionsProps<TValue> & {
		placeholder?: string
		/**
		 * Render as a search over the options, with the selection shown as chips — the
		 * multi-value spelling of {@link SelectFieldPropsFor.searchable}, with the same two
		 * runtime requirements (an `optionsFrom` source, in the two-hook form) and the same
		 * two throws naming the field when either is missing.
		 *
		 * The source needs no change to serve both: `useSelectedOptions` already takes the
		 * values to resolve as an **array**, and here it simply receives more than one.
		 */
		searchable?: boolean
	} & CreatableProps<TValue>

export type MultiSelectFieldProps<TFormData> =
	| MultiSelectFieldPropsFor<TFormData, string>
	| MultiSelectFieldPropsFor<TFormData, number>

type CheckboxGroupFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue[]> & OptionsProps<TValue>

export type CheckboxGroupFieldProps<TFormData> =
	| CheckboxGroupFieldPropsFor<TFormData, string>
	| CheckboxGroupFieldPropsFor<TFormData, number>

export type CheckboxFieldProps<TFormData> = BaseFieldProps<TFormData, boolean>

export type SwitchFieldProps<TFormData> = BaseFieldProps<TFormData, boolean>

type RadioGroupFieldPropsFor<TFormData, TValue> = BaseFieldProps<TFormData, TValue> & OptionsProps<TValue>

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
