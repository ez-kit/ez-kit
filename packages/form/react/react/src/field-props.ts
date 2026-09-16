import type { BoundFieldApi } from './bindable-form'
import type { FormComponents } from './contract'
import type { FieldValidateProps } from './field-validate'
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
	/**
	 * Mark the control as mandatory — the asterisk and `aria-required`. **Visual only:** it
	 * validates nothing, which is what a caller whose validation lives elsewhere (a zod
	 * schema on the form, say) needs in order to render the mark without this package
	 * second-guessing their validator.
	 *
	 * To *enforce* it, use `validate={{ required: true }}`, which implies this one — the two
	 * props have distinct jobs, they are not two spellings of one.
	 */
	required?: boolean
	/**
	 * Per-field validation, in the **same `FieldValidate` vocabulary** a schema document's
	 * field node uses, run through the same engine in `@ez-kit/form-core` — see
	 * {@link FieldValidateProps} for the two document-only keys it subtracts.
	 *
	 * Runs on `onChange`, the hook the schema side attaches its generated validator to, so
	 * both entry points behave identically (including when the error is *shown*, which is
	 * gated on `isTouched` either way).
	 *
	 * It layers on top of whatever `validators` the form itself carries rather than
	 * replacing them: both run on every change. They share the field's single `onChange`
	 * error slot, so when both fail it is this one's message that shows — the form-level
	 * one appears as soon as the field's own constraints are satisfied.
	 *
	 * @example
	 * <form.TextField name='email' label='Email' validate={{ required: true, format: 'email' }} />
	 * <form.MultiSelectField name='tags' options={TAGS} validate={{ maxLength: 2 }} />
	 */
	validate?: FieldValidateProps
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

/**
 * What one entry of a repeatable group hands the author.
 *
 * It **is** the form's own field set, retyped over the item: inside an entry `name` addresses
 * the item's paths, so `<item.TextField name='firstName' />` is checked against the item type
 * and a root-level name is a compile error there. No path is composed at the call site — the
 * prefix is joined on at render.
 */
export type ArrayItemScope<TItem> = FormFieldComponents<TItem> & {
	/**
	 * A stable id for this entry, for React's `key`. **Never the index**: removing an entry from
	 * the middle renumbers everything after it, and a keyed-by-index list would then reuse the
	 * wrong component instance — carrying an open calendar or a half-typed search query onto its
	 * neighbour while the submitted values still look correct.
	 */
	key: string
	index: number
	/** Whether this entry is currently first / last — the flags a disable-at-the-ends control needs. */
	isFirst: boolean
	isLast: boolean
	/** Remove this entry. */
	remove: () => void
	/**
	 * Move this entry one position up / down. Always callable, unlike the kit's rendered arrows,
	 * which stay governed by `reorderable` — a no-op at either end rather than `undefined` keeps
	 * this scope's shape constant, so an author can wire a control with no null check.
	 */
	moveUp: () => void
	moveDown: () => void
	/** This entry's chrome — heading, remove control, reorder controls. Wrap the entry's fields. */
	Item: (props: { children: ReactNode }) => ReactNode
}

export type ArrayScope<TItem> = {
	items: readonly ArrayItemScope<TItem>[]
	/**
	 * Append a fresh entry, built from the field's own `newItem`. Deliberately no parameter: an
	 * `insert`/`remove`/`move` all take a mandatory index first, so a synthetic click event can
	 * never satisfy their signature — `add` would be the only member an author could write as
	 * `onClick={add}` verbatim, and whether that compiled would turn on whether the item type
	 * happened to be structurally satisfied by a `MouseEvent` (an item shaped `{ type: string }`
	 * compiles clean and appends the event as the entry). To append a specific value, use
	 * `insert(items.length, value)` — the same operation, spelled once.
	 */
	add: () => void
	insert: (index: number, value?: TItem) => void
	remove: (index: number) => void
	move: (from: number, to: number) => void
	/**
	 * `false` once `validate.maxLength` is reached; kits render their add control disabled rather
	 * than hide it. The same option is both bounds — the one that fails with a message, and the
	 * one that stops the control offering.
	 */
	canAdd: boolean
	/** The list's own errors — `validate.maxLength`, say — formatted the same way a flat field's are. */
	errors: string[]
	invalid: boolean
	/**
	 * The `disabled` / `required` given to `ArrayField` or `Array`, reaching the scope as **data**
	 * — the same principle `errors` / `invalid` already follow. `ArrayField` renders `required` on
	 * its own frame and `disabled` on `item.Item`'s chrome; `form.Array` renders no frame and
	 * `item.Item` is optional, so reading these off the scope is the only way either fact reaches
	 * a bare primitive's own fields. Always a `boolean`, never `undefined` — the scope hands out
	 * facts, not the tri-state the prop itself allows.
	 */
	disabled: boolean
	required: boolean
	/** The kit's generic button, for a control an author draws themselves outside `Item`. */
	Button: FormComponents['Button']
	/** The array field's own bound field — for a `Subscribe`-style read the scope does not cover. */
	field: BoundFieldApi
}

/** One scope serves both `form.ArrayField` and the headless `form.Array`. */
export type ArrayFieldScope<TItem> = ArrayScope<TItem>

/**
 * A repeatable group of fields — the JSX spelling of an `array` node.
 *
 * `newItem` is required here and has no counterpart in a schema document: a document declares
 * each field's `defaultValue`, so the renderer can build a fresh entry from the subtree, while a
 * render prop declares nothing the package can read.
 */
export type ArrayFieldProps<TFormData, TItem> = {
	name: DeepKeysOfType<TFormData, readonly TItem[]>
	label?: ReactNode
	description?: ReactNode
	disabled?: boolean
	required?: boolean
	validate?: FieldValidateProps
	/**
	 * Offer move-up / move-down on every entry. The gesture itself is the kit's business.
	 *
	 * The object form only adds captions for the two controls; `true` **is** the plain form and
	 * means the same thing with the kit's defaults, so nothing has to be written twice.
	 */
	reorderable?: boolean | { up?: { label?: ReactNode }; down?: { label?: ReactNode } }
	/** The value a newly appended entry starts from. */
	newItem: TItem
	addLabel?: ReactNode
	removeLabel?: ReactNode
	/** Caption for one entry, given its zero-based position. */
	itemLabel?: (index: number) => ReactNode
	children: (scope: ArrayFieldScope<TItem>) => ReactNode
}

/**
 * A repeatable group with no chrome of its own — the headless counterpart of `ArrayField`.
 *
 * `ArrayField` draws its own label, add/remove controls and item frames; `form.Array` renders
 * only what `children` return, handing them the same {@link ArrayScope} so every control and the
 * surrounding layout are the author's. Use it when the kit's own chrome does not fit — a remove
 * control in a card heading, entries laid out as table rows, and so on.
 */
export type ArrayProps<TFormData, TItem> = {
	name: DeepKeysOfType<TFormData, readonly TItem[]>
	disabled?: boolean
	required?: boolean
	validate?: FieldValidateProps
	/** The value a newly appended entry starts from. */
	newItem: TItem
	children: (scope: ArrayScope<TItem>) => ReactNode
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
	/**
	 * Generic per call, not per form: the item type is inferred from `name`, which is what lets
	 * one member cover every array in `TFormData` — and what makes a nested array inside an
	 * entry work with no extra machinery.
	 */
	ArrayField: <TItem>(props: ArrayFieldProps<TFormData, TItem>) => ReactNode
	/**
	 * Generic per call, for the same reason `ArrayField` is — see its doc comment.
	 */
	Array: <TItem>(props: ArrayProps<TFormData, TItem>) => ReactNode
	SubmitButton: (props: SubmitButtonProps) => ReactNode
	Section: (props: SectionProps) => ReactNode
	GridItem: (props: GridItemProps) => ReactNode
}

/**
 * A headed group of fields on a column grid — the JSX spelling of a `section` node.
 *
 * The two entry points render the same kit component and therefore the same DOM: a document
 * says `{ type: 'section', title, columns }`, JSX writes `<form.Section title columns>`, and
 * both reach `FormComponents['Section']`. Sections are pure layout — nesting a field inside
 * one changes neither its `name`, nor the path its value lives at, nor its validation.
 *
 * `columns` is the same 1..4 range the v1 format allows (`GRID_MIN`/`GRID_MAX`); the kit
 * clamps anything outside it. Nest a section inside a section to build a different grid
 * inside a grid.
 *
 * @example
 * <form.Section title='Contact' columns={2}>
 *   <form.TextField name='firstName' label='First name' />
 *   <form.TextField name='lastName' label='Last name' />
 *   <form.GridItem colSpan={2}>
 *     <form.TextField name='email' label='Email' />
 *   </form.GridItem>
 * </form.Section>
 */
export type SectionProps = {
	title?: ReactNode
	description?: ReactNode
	/** Grid columns for the direct children. Default 1. Must be an integer 1..4. */
	columns?: number
	children: ReactNode
}

/**
 * One cell of a section's grid — the JSX spelling of a node's `colSpan`.
 *
 * Only needed to span more than one column: a child written straight into a `Section` is
 * already a grid item of its own and occupies a single column. It wraps *anything*, a nested
 * `Section` included, and carries no field binding — `colSpan` is geometry, not state.
 *
 * @example
 * <form.GridItem colSpan={2}>
 *   <form.TextareaField name='notes' label='Notes' />
 * </form.GridItem>
 */
export type GridItemProps = {
	/** Columns this item spans. Default 1. Must be an integer 1..4. */
	colSpan?: number
	children: ReactNode
}
