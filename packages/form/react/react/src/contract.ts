import type { DateRangeValue, SelectOption, TextInputType } from '@ez-kit/form-core'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * The UI-kit contract, in **two bags**.
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
 * The two bags differ in whether they are **closed**:
 *
 * - {@link FormComponents} is the form's **chrome** — the array frame and entry, the button,
 *   the `<form>` element, the section grid and the wizard. Seven slots, a closed set: nothing
 *   an app registers belongs here, because none of it is a field kind.
 * - {@link FormFieldSlots} is the twelve **field kinds**. It is the shape a kit's
 *   `formFieldSlots` export is written against (`satisfies FormFieldSlots`), so a forgotten
 *   built-in is a compile error there — but `createForm({ fields })` accepts *additional*
 *   keys, which is how an app adds `RatingField` to the instance and `{ type: 'rating' }` to
 *   a schema document.
 *
 * Both `@ez-kit/form-shadcn` and `@ez-kit/form-heroui` implement these identical interfaces,
 * which is what lets one example render under either kit:
 *
 * ```ts
 * export const formComponents = { ArrayField, ArrayItem, … } satisfies FormComponents
 * export const formFieldSlots = { TextField, NumberField, … } satisfies FormFieldSlots
 * createForm({ components: formComponents, fields: formFieldSlots })
 * ```
 */

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
	/**
	 * Which kind of field this is; also spread onto the kit's root.
	 *
	 * `string`, not `FormFieldType`: a schema may declare a **custom** field kind under any
	 * author-chosen `type`, and that node's binding goes through this very shape. Narrowing to
	 * the enum made the contract claim something untrue and forced an `as unknown as` cast at
	 * the custom-field call site; a kit that wants to branch on a built-in still compares
	 * against `FormFieldType`, whose members are plain strings.
	 */
	'data-field-type': string
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

/**
 * What an option-bearing field adds on top of {@link FieldRenderProps}.
 *
 * `loading` is a plain `boolean`, not `boolean | undefined` like the optional consumer
 * inputs above: absence and `false` would mean the same thing, and a kit that has to render
 * *something* for every state should never have to collapse the two itself. The binding
 * layer defaults an omitted consumer prop to `false`.
 */
type OptionsRenderProps = {
	options: readonly SelectOption[]
	/**
	 * The list is still loading; an empty `options` does not mean there is nothing to choose
	 * from. Kits render a skeleton and keep the control non-interactive while it is true —
	 * which is also what covers the edit-form case where a value arrives from the server
	 * before the option it should be labelled by.
	 */
	loading: boolean
}

/**
 * The query state of a `searchable` field, as the kit receives it — the one key `select` and
 * `multiselect` grew for the feature, and they grew the identical one.
 *
 * One bundled key rather than three loose ones, because the three only ever make sense
 * together — its presence *is* the mode switch, so a kit branches once (`search !== undefined`)
 * instead of correlating a flag with two handlers it has to trust are there. `undefined` means
 * a plain control, which is what every field that is not `searchable` gets.
 *
 * The **renderer** owns the query: it is what feeds the option source, which for a searchable
 * field returns only the page matching the last query. So the kit is fully controlled here
 * like everywhere else in this contract — report what was typed, render what `options` says,
 * and never filter `options` yourself; that has already happened server-side.
 *
 * `options` always contains the option for everything currently selected, even when the
 * search that produced the rest of the list did not return it — the renderer merges those in
 * from a second query. From here it is still just "find the option whose value matches",
 * which for a multi-select is what puts a **label** on each chip instead of a raw id.
 *
 * After a selection a kit is expected to clear the query (`onQueryChange('')`), so the next
 * search starts fresh rather than leaving a stale term beside a chip that already consumed it.
 *
 * The query arrives **raw**, on every keystroke. Debouncing is the source's job for now and is
 * not a kit concern.
 */
type SearchRenderProps = {
	search: { query: string; onQueryChange: (query: string) => void } | undefined
}

export type SelectFieldRenderProps = FieldRenderProps &
	OptionsRenderProps &
	SearchRenderProps & {
		value: string
		onChange: (value: string) => void
		placeholder: string | undefined
	}

/**
 * The multi-value counterparts of `SelectFieldRenderProps` / `RadioGroupFieldRenderProps`.
 *
 * `value` is always a list — `[]` when nothing is selected, never `undefined` — so a kit
 * never has to decide what "no selection yet" looks like, and `onChange` always reports the
 * complete new selection rather than a toggle.
 */
export type MultiSelectFieldRenderProps = FieldRenderProps &
	OptionsRenderProps &
	SearchRenderProps & {
		value: readonly string[]
		onChange: (value: string[]) => void
		placeholder: string | undefined
	}

export type CheckboxGroupFieldRenderProps = FieldRenderProps &
	OptionsRenderProps & {
		value: readonly string[]
		onChange: (value: string[]) => void
	}

export type CheckboxFieldRenderProps = FieldRenderProps & {
	checked: boolean
	onChange: (checked: boolean) => void
}

export type SwitchFieldRenderProps = FieldRenderProps & {
	checked: boolean
	onChange: (checked: boolean) => void
}

export type RadioGroupFieldRenderProps = FieldRenderProps &
	OptionsRenderProps & {
		value: string
		onChange: (value: string) => void
	}

/**
 * Both dates are `YYYY-MM-DD` strings, never `Date` objects — see `date-value.ts` in
 * `@ez-kit/form-core`. Converting to whatever the kit's picker wants (`CalendarDate` for
 * HeroUI, `Date` for react-day-picker) is the kit's job, and it is the only place a date
 * library is allowed to appear.
 */
export type DateFieldRenderProps = FieldRenderProps & {
	/** `undefined` while nothing is picked — an empty date is genuinely "no date". */
	value: string | undefined
	onChange: (value: string | undefined) => void
	placeholder: string | undefined
	min: string | undefined
	max: string | undefined
}

/**
 * A range is reported only once **both** ends are chosen; a half-picked range stays inside
 * the picker, so form state never holds `{ start, end: undefined }` and every consumer of
 * the value — validation, submission, a `when` rule — sees one shape.
 */
export type DateRangeFieldRenderProps = FieldRenderProps & {
	value: DateRangeValue | undefined
	onChange: (value: DateRangeValue | undefined) => void
	placeholder: string | undefined
	min: string | undefined
	max: string | undefined
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

// ── arrays ───────────────────────────────────────────────────────────────────

/**
 * The chrome around **one** entry of a repeatable group.
 *
 * A separate slot from {@link ArrayFieldRenderProps} for the same reason `GridItem` is separate
 * from `Section`: the container draws the list, the item draws one row of it — and only the item
 * can place its own remove control, since it is the only component that knows where the row ends.
 *
 * The item's fields arrive as `children`, already bound to this entry's paths. A kit renders
 * them; it never needs to know the index they resolved to.
 */
export type ArrayItemRenderProps = {
	/** The zero-based position, spread onto the kit's root so CSS and tests can address a row. */
	'data-index': number
	index: number
	/**
	 * Caption for this entry, already resolved — a card heading, typically. Empty when the author
	 * gave none, which is the common case for a compact row.
	 */
	label: ReactNode
	/** Caption for the remove control, already resolved. */
	removeLabel: ReactNode
	/**
	 * Captions for the two reorder controls, already resolved. Present whether or not the move
	 * is currently possible, so the disabled control still has an accessible name.
	 */
	moveUpLabel: ReactNode
	moveDownLabel: ReactNode
	/**
	 * The list is disabled. Passed down to the entry because a disabled array must not offer a
	 * live remove or move control on every row — the fields inside may be disabled by the kit's
	 * own `fieldset`, but these controls are the entry's chrome and belong to this slot.
	 */
	disabled: boolean | undefined
	onRemove: () => void
	/**
	 * Move this entry one place earlier or later. `undefined` when reordering is off **or** when
	 * the move is impossible — the first entry has no `onMoveUp` — so a kit disables or omits the
	 * control by asking one question rather than correlating a flag with an index and a length.
	 */
	onMoveUp: (() => void) | undefined
	onMoveDown: (() => void) | undefined
	children: ReactNode
}

/**
 * A repeatable group of fields.
 *
 * `errors` are the **list's own** — a `minLength`, or a cross-item rule that blamed the list
 * rather than an entry. Errors belonging to a field inside an entry reach that field through its
 * own slot and never appear here, which is why the two are not merged: a kit that showed both in
 * one place would repeat every item's message at the top of the list.
 */
export type ArrayFieldRenderProps = {
	'data-field': string
	/** Always `'array'`, for symmetry with every other field's `data-field-type`. */
	'data-field-type': string
	name: string
	label: ReactNode
	description: ReactNode
	errors: string[]
	invalid: boolean
	disabled: boolean | undefined
	required: boolean | undefined
	/** The entries, each already wrapped in the kit's own `ArrayItem`. */
	children: ReactNode
	/** Caption for the control that appends an entry, already resolved. */
	addLabel: ReactNode
	onAdd: () => void
	/**
	 * Whether appending is possible right now — `false` once a `maxLength` bound is reached. A
	 * plain boolean rather than an absent `onAdd`, because a kit should be able to render the
	 * control disabled rather than have it vanish under the user's cursor.
	 */
	canAdd: boolean
}

// ── layout ───────────────────────────────────────────────────────────────────

export type SectionRenderProps = {
	title: ReactNode
	description: ReactNode
	/** Grid columns for the direct children. `undefined` means one column. */
	columns: number | undefined
	children: ReactNode
}

export type GridItemRenderProps = {
	/** Columns this item spans. `undefined` means one. */
	colSpan: number | undefined
	children: ReactNode
}

// ── wizard ───────────────────────────────────────────────────────────────────

export type WizardStep = {
	index: number
	/** Already resolved by the adapter (`resolveText(step.title, translate)`) — same rule as `FieldRenderProps.label`. */
	title: ReactNode
	/** Already resolved by the adapter — same rule as `FieldRenderProps.description`. */
	description: ReactNode
	status: 'complete' | 'current' | 'upcoming'
	/** Visited and failing validation. Never true for an unvisited step. */
	invalid: boolean
	/** Cannot be navigated to right now. */
	disabled: boolean
	goTo: () => void
}

export type WizardRenderProps = {
	steps: WizardStep[]
	currentIndex: number
	canGoBack: boolean
	canGoNext: boolean
	isLastStep: boolean
	/** Validates the current step's fields, advances only if they pass. */
	goNext: () => void
	goBack: () => void
	submitting: boolean
	/** The current step's fields. */
	children: ReactNode
}

// ── form level ───────────────────────────────────────────────────────────────

export type ButtonProps = {
	type?: 'submit' | 'button'
	disabled?: boolean
	/**
	 * Optional so the submit button (which fires through the surrounding `<form>`'s submit
	 * event, not a click handler) can keep passing none. Typed `() => void` rather than a DOM
	 * `MouseEventHandler` so a scope callback — `add`, say — can be handed straight through
	 * without an event parameter to ignore.
	 */
	onClick?: () => void
	children: ReactNode
}

export type FormElementProps = ComponentPropsWithoutRef<'form'>

// ── the contract itself ──────────────────────────────────────────────────────

/**
 * The twelve built-in field kinds a kit supplies.
 *
 * Written against with `satisfies FormFieldSlots` so a forgotten built-in is a compile error
 * in the kit. It is **not** what `createForm({ fields })` accepts — that takes any
 * {@link FormFieldRegistry}, the kit's twelve spread beside whatever the app registers —
 * which is the one asymmetry with {@link FormComponents}: the chrome is closed, the field
 * set is open.
 *
 * The key names are load-bearing twice over. Each one routes to that field's own binder
 * (replacing `TextField` here swaps the kit's input while keeping the `asText` coercion and
 * the rest of the text binding), and each one **derives its document id** by dropping a
 * trailing `Field` and lowercasing the rest — `RadioGroupField` → `radiogroup`. The
 * derivation runs this way round because the reverse is lossy: nothing recovers
 * `RadioGroupField` from `radiogroup`.
 */
export type FormFieldSlots = {
	TextField: (props: TextFieldRenderProps) => ReactNode
	NumberField: (props: NumberFieldRenderProps) => ReactNode
	TextareaField: (props: TextareaFieldRenderProps) => ReactNode
	SelectField: (props: SelectFieldRenderProps) => ReactNode
	CheckboxField: (props: CheckboxFieldRenderProps) => ReactNode
	SwitchField: (props: SwitchFieldRenderProps) => ReactNode
	RadioGroupField: (props: RadioGroupFieldRenderProps) => ReactNode
	SliderField: (props: SliderFieldRenderProps) => ReactNode
	MultiSelectField: (props: MultiSelectFieldRenderProps) => ReactNode
	CheckboxGroupField: (props: CheckboxGroupFieldRenderProps) => ReactNode
	DateField: (props: DateFieldRenderProps) => ReactNode
	DateRangeField: (props: DateRangeFieldRenderProps) => ReactNode
}

/**
 * The form's chrome — every component a kit must supply that is **not** a field kind.
 *
 * A closed set of seven, all required: the array frame and its entry, the generic button,
 * the `<form>` element, the section grid, its cell and the wizard. The field kinds live in
 * {@link FormFieldSlots}; `ArrayField` / `ArrayItem` are here rather than there because they
 * are consumed as chrome by one binder (`createArrayField`), not registered as a per-kind
 * binder of their own.
 */
export type FormComponents = {
	ArrayField: (props: ArrayFieldRenderProps) => ReactNode
	ArrayItem: (props: ArrayItemRenderProps) => ReactNode
	Button: (props: ButtonProps) => ReactNode
	Form: (props: FormElementProps) => ReactNode
	Section: (props: SectionRenderProps) => ReactNode
	GridItem: (props: GridItemRenderProps) => ReactNode
	Wizard: (props: WizardRenderProps) => ReactNode
}
