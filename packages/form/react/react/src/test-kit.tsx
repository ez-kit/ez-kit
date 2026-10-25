import { useState } from 'react'

import { useFormContext } from './form-context'

import type {
	ArrayFieldRenderProps,
	ArrayItemRenderProps,
	DateFieldRenderProps,
	DateRangeFieldRenderProps,
	AllFormFieldSlots,
	FieldRenderProps,
	FormComponents,
	FormElementProps,
	MultiSelectFieldRenderProps,
	NumberFieldRenderProps,
	SelectFieldRenderProps,
	SliderFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
} from './contract'
import type { GridItemProps, GridProps, SectionProps, SubmitButtonProps } from './field-props'
import type { HTMLInputTypeAttribute, ReactNode } from 'react'

/**
 * A minimal, deliberately unstyled kit used by this package's own tests.
 *
 * It exists to prove the injection contract end to end without dragging in shadcn or
 * HeroUI. Every element stamps a `data-testkit` marker so a test can assert that the
 * *injected* component rendered rather than something built in — this package ships no
 * visible elements of its own.
 */

/**
 * The props this kit takes beyond the contract — the input attributes it renders. A kit declares
 * these itself; `form.<Field>` picks them up from the component's own parameter.
 */
type PlaceholderProps = { placeholder?: string | undefined }
type NumericBoundsProps = { min?: number | undefined; max?: number | undefined; step?: number | undefined }
type DateBoundsProps = PlaceholderProps & { min?: string | undefined; max?: string | undefined }

/** Suffixes the kit appends to the field id to build the ids `aria-describedby` points at. */
const DESCRIPTION_ID_SUFFIX = '-description'
const ERROR_ID_SUFFIX = '-error'

/** The one minimum that reads in the singular. */
const SINGULAR_MIN_LENGTH = 1

/** What a searchable field shows while the typed text is shorter than its `minLength`. */
const searchHint = (minLength: number): string =>
	`Type at least ${String(minLength)} ${minLength === SINGULAR_MIN_LENGTH ? 'character' : 'characters'}`

/** Only the chrome half of the field — the control half is handled by `children`. */
type ShellProps = Omit<FieldRenderProps, 'name' | 'onBlur' | 'disabled' | 'required'> & {
	/** Receives the ids the chrome actually rendered, so the control can point at them. */
	children: (aria: { 'aria-describedby': string | undefined }) => ReactNode
	/** A checkbox reads as `[control] Label`; everything else stacks label-first. */
	controlFirst?: boolean
}

/**
 * The shared chrome of the test kit — the shape a plain-DOM kit naturally has: label,
 * description and error as siblings of the control, wired by explicit ids.
 */
function Shell({ id, label, description, errors, invalid, children, controlFirst, ...data }: ShellProps): ReactNode {
	const descriptionId = description != null ? `${id}${DESCRIPTION_ID_SUFFIX}` : undefined
	const errorId = invalid ? `${id}${ERROR_ID_SUFFIX}` : undefined
	const describedBy = [descriptionId, errorId].filter((value) => value !== undefined).join(' ') || undefined

	const labelNode = label != null && (
		<label
			data-testkit='label'
			htmlFor={id}
		>
			{label}
		</label>
	)
	const control = children({ 'aria-describedby': describedBy })

	return (
		<div
			data-testkit='field-root'
			// Kit-owned CSS hook. HeroUI gets the same attribute from React Aria for free; a
			// plain-DOM kit stamps it itself.
			data-invalid={invalid || undefined}
			{...data}
		>
			{controlFirst === true ? control : labelNode}
			{controlFirst === true ? labelNode : control}
			{descriptionId !== undefined && (
				<p
					data-testkit='description'
					id={descriptionId}
				>
					{description}
				</p>
			)}
			{errorId !== undefined && (
				<p
					data-testkit='error'
					id={errorId}
					role='alert'
				>
					{errors.join(', ')}
				</p>
			)}
		</div>
	)
}

/** The layout half of the test kit — unstyled, marker attributes only. */
function Section({ title, description, children }: SectionProps): ReactNode {
	return (
		<section data-testid='section'>
			{title !== undefined && <h3>{title}</h3>}
			{description !== undefined && <p>{description}</p>}
			{children}
		</section>
	)
}

function GridView({ columns, children }: GridProps): ReactNode {
	return (
		<div
			data-testid='grid'
			data-columns={columns}
		>
			{children}
		</div>
	)
}

function GridItem({ colSpan, children }: GridItemProps): ReactNode {
	return (
		<div
			data-testid='grid-item'
			data-col-span={colSpan}
		>
			{children}
		</div>
	)
}

const Grid = Object.assign(GridView, { Item: GridItem })

/**
 * The range stand-in keeps its own half-picked state, exactly as the real kits do: the
 * contract reports a range only once **both** ends are set, so the end a user has already
 * typed has nowhere else to live while the other one is still empty.
 */
function TestDateRangeField({
	value,
	onChange,
	placeholder,
	min,
	max,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: DateRangeFieldRenderProps & DateBoundsProps): ReactNode {
	const [draft, setDraft] = useState<{ start: string; end: string }>({ start: '', end: '' })
	const current = value ?? draft

	const change = (next: { start: string; end: string }): void => {
		setDraft(next)
		onChange(next.start === '' || next.end === '' ? undefined : next)
	}

	return (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<span data-testkit='date-range'>
					<input
						id={id}
						name={`${name}.start`}
						type='date'
						aria-label='start'
						placeholder={placeholder}
						min={min}
						max={max}
						disabled={disabled}
						required={required}
						aria-invalid={field.invalid}
						value={current.start}
						onBlur={onBlur}
						onChange={(event) => {
							change({ ...current, start: event.target.value })
						}}
						{...aria}
					/>
					<input
						name={`${name}.end`}
						type='date'
						aria-label='end'
						min={min}
						max={max}
						disabled={disabled}
						value={current.end}
						onBlur={onBlur}
						onChange={(event) => {
							change({ ...current, end: event.target.value })
						}}
					/>
				</span>
			)}
		</Shell>
	)
}

/** Minimal array chrome: enough surface for a test to drive, no styling of any kind. */
const TestArrayFrame = ({
	label,
	description,
	errors,
	invalid,
	children,
	addLabel,
	onAdd,
	canAdd,
	...field
}: ArrayFieldRenderProps): ReactNode => (
	<div
		data-testkit='array'
		{...field}
	>
		{label !== null && label !== undefined && <span data-testkit='array-label'>{label}</span>}
		{description !== null && description !== undefined && <span data-testkit='array-description'>{description}</span>}
		<div data-testkit='array-items'>{children}</div>
		<button
			type='button'
			disabled={!canAdd}
			onClick={onAdd}
		>
			{addLabel}
		</button>
		{invalid && <span data-testkit='array-errors'>{errors.join(', ')}</span>}
	</div>
)

const TestArrayItem = ({
	index,
	label,
	removeLabel,
	moveUpLabel,
	moveDownLabel,
	disabled,
	onRemove,
	onMoveUp,
	onMoveDown,
	children,
	...item
}: ArrayItemRenderProps): ReactNode => (
	<div
		data-testkit='array-item'
		{...item}
	>
		{label !== null && label !== undefined && (
			<span
				data-testkit='array-item-label'
				data-testid='array-item-label'
			>
				{label}
			</span>
		)}
		{children}
		<button
			type='button'
			aria-label={`${String(removeLabel)} ${String(index)}`}
			disabled={disabled}
			onClick={onRemove}
		>
			{removeLabel}
		</button>
		{(onMoveUp !== undefined || onMoveDown !== undefined) && (
			<>
				<button
					type='button'
					aria-label={`up ${String(index)}`}
					disabled={disabled === true || onMoveUp === undefined}
					onClick={onMoveUp}
				>
					{moveUpLabel}
				</button>
				<button
					type='button'
					aria-label={`down ${String(index)}`}
					disabled={disabled === true || onMoveDown === undefined}
					onClick={onMoveDown}
				>
					{moveDownLabel}
				</button>
			</>
		)}
	</div>
)

/** The array frame, carrying its entry view — the shape a kit's `ArrayField` export has. */
const TestArrayField = Object.assign(TestArrayFrame, { Item: TestArrayItem })

/** The twelve field kinds and the array frame — the test kit's `fields`. */
export const testFields = {
	TextField: ({
		value,
		onChange,
		type,
		placeholder,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: TextFieldRenderProps & PlaceholderProps & { type?: HTMLInputTypeAttribute | undefined }) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<input
					data-testkit='text-input'
					id={id}
					name={name}
					type={type ?? 'text'}
					placeholder={placeholder}
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					value={value}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.value)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	NumberField: ({
		value,
		onChange,
		placeholder,
		min,
		max,
		step,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: NumberFieldRenderProps & PlaceholderProps & NumericBoundsProps) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<input
					data-testkit='number-input'
					id={id}
					name={name}
					type='number'
					placeholder={placeholder}
					min={min}
					max={max}
					step={step}
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					// An empty numeric control has no number; `''` keeps the input controlled while
					// the form state holds `undefined`.
					value={value ?? ''}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	TextareaField: ({
		value,
		onChange,
		placeholder,
		rows,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: TextareaFieldRenderProps & PlaceholderProps & { rows?: number | undefined }) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<textarea
					data-testkit='textarea'
					id={id}
					name={name}
					placeholder={placeholder}
					rows={rows}
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					value={value}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.value)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	SelectField: ({
		value,
		onChange,
		options,
		loading,
		search,
		placeholder,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: SelectFieldRenderProps & PlaceholderProps) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<>
					{/* A searchable select is a combobox in both real kits; the test kit keeps the
					    native `<select>` and puts the query in a plain sibling input, so a test can
					    assert on the *contract* (what reaches `onQueryChange`, what `options` holds)
					    without depending on either kit's popover anatomy. */}
					{search !== undefined && (
						<input
							data-testkit='select-search'
							aria-label={`Search ${name}`}
							value={search.query}
							onChange={(event) => {
								search.onQueryChange(event.target.value)
							}}
						/>
					)}
					{search?.belowMinLength === true && <p data-testkit='search-hint'>{searchHint(search.minLength)}</p>}
					<select
						data-testkit='select'
						data-loading={loading || undefined}
						id={id}
						name={name}
						// Both real kits keep a searchable control enabled while it loads — it loads on
						// nearly every pause in typing — so the stand-in does too.
						disabled={disabled === true || (loading && search === undefined)}
						required={required}
						aria-invalid={field.invalid}
						value={value}
						onBlur={onBlur}
						onChange={(event) => {
							onChange(event.target.value)
						}}
						{...aria}
					>
						{placeholder !== undefined && <option value=''>{placeholder}</option>}
						{options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</option>
						))}
					</select>
				</>
			)}
		</Shell>
	),
	CheckboxField: ({ checked, onChange, id, name, onBlur, disabled, required, ...field }) => (
		<Shell
			controlFirst
			id={id}
			{...field}
		>
			{(aria) => (
				<input
					data-testkit='checkbox'
					id={id}
					name={name}
					type='checkbox'
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					checked={checked}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.checked)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	SwitchField: ({ checked, onChange, id, name, onBlur, disabled, required, ...field }) => (
		<Shell
			controlFirst
			id={id}
			{...field}
		>
			{(aria) => (
				<input
					data-testkit='switch'
					id={id}
					name={name}
					type='checkbox'
					role='switch'
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					checked={checked}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.checked)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	RadioGroupField: ({ value, onChange, options, loading, id, name, onBlur, disabled, required, ...field }) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<div
					data-testkit='radiogroup'
					data-loading={loading || undefined}
					id={id}
					role='radiogroup'
					aria-invalid={field.invalid}
					{...aria}
				>
					{options.map((option) => (
						<label
							key={option.value}
							data-testkit='radio-option'
						>
							<input
								type='radio'
								name={name}
								value={option.value}
								disabled={disabled === true || loading || option.disabled === true}
								required={required}
								checked={value === option.value}
								onBlur={onBlur}
								onChange={(event) => {
									onChange(event.target.value)
								}}
							/>
							{option.label}
						</label>
					))}
				</div>
			)}
		</Shell>
	),
	SliderField: ({
		value,
		onChange,
		min,
		max,
		step,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: SliderFieldRenderProps & NumericBoundsProps) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<input
					data-testkit='slider'
					id={id}
					name={name}
					type='range'
					min={min}
					max={max}
					step={step}
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					value={value}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.valueAsNumber)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	DateField: ({
		value,
		onChange,
		placeholder,
		min,
		max,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: DateFieldRenderProps & DateBoundsProps) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<input
					data-testkit='date'
					id={id}
					name={name}
					type='date'
					placeholder={placeholder}
					min={min}
					max={max}
					disabled={disabled}
					required={required}
					aria-invalid={field.invalid}
					value={value ?? ''}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(event.target.value === '' ? undefined : event.target.value)
					}}
					{...aria}
				/>
			)}
		</Shell>
	),
	MultiSelectField: ({
		value,
		onChange,
		options,
		loading,
		search,
		placeholder,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}: MultiSelectFieldRenderProps & PlaceholderProps) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<>
					{/* Both real kits draw the selection as chips beside a search box. The test kit
					    keeps the native multiple `<select>` and adds the query input plus a plain
					    list of chips, so a test can assert on the *contract* — what reaches
					    `onQueryChange`, what `options` holds, and which label each selected value
					    resolves to — without depending on either kit's combobox anatomy. */}
					{search !== undefined && (
						<>
							<input
								data-testkit='multiselect-search'
								aria-label={`Search ${name}`}
								value={search.query}
								onChange={(event) => {
									search.onQueryChange(event.target.value)
								}}
							/>
							{search.belowMinLength && <p data-testkit='search-hint'>{searchHint(search.minLength)}</p>}
							<ul data-testkit='multiselect-chips'>
								{value.map((entry) => (
									<li
										key={entry}
										data-testkit='multiselect-chip'
										data-value={entry}
									>
										{options.find((option) => option.value === entry)?.label ?? entry}
									</li>
								))}
							</ul>
						</>
					)}
					<select
						data-testkit='multiselect'
						data-loading={loading || undefined}
						multiple
						id={id}
						name={name}
						// Enabled while a search loads, as in both real kits — see the select above.
						disabled={disabled === true || (loading && search === undefined)}
						required={required}
						aria-invalid={field.invalid}
						// A native multiple select has no placeholder slot, and `aria-placeholder` is
						// illegal on its implicit listbox role — the real kits render one on their own
						// trigger instead, so this stand-in only has to prove the prop reaches them.
						data-placeholder={placeholder}
						value={[...value]}
						onBlur={onBlur}
						onChange={(event) => {
							onChange(Array.from(event.target.selectedOptions, (option) => option.value))
							// Both kits clear the query once a selection lands; the stand-in does the
							// same, so a test asserts the behaviour the contract asks for rather than
							// one kit's implementation of it.
							search?.onQueryChange('')
						}}
						{...aria}
					>
						{options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</option>
						))}
					</select>
				</>
			)}
		</Shell>
	),
	CheckboxGroupField: ({ value, onChange, options, loading, id, name, onBlur, disabled, required, ...field }) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<fieldset
					data-testkit='checkbox-group'
					data-loading={loading || undefined}
					aria-invalid={field.invalid}
					{...aria}
				>
					{options.map((option) => (
						<label key={option.value}>
							<input
								type='checkbox'
								name={name}
								value={option.value}
								disabled={disabled === true || loading || option.disabled === true}
								required={required}
								checked={value.includes(option.value)}
								onBlur={onBlur}
								onChange={(event) => {
									onChange(
										event.target.checked ? [...value, option.value] : value.filter((entry) => entry !== option.value),
									)
								}}
							/>
							{option.label}
						</label>
					))}
				</fieldset>
			)}
		</Shell>
	),
	// Two native inputs rather than a calendar: this kit exists so the adapter's own tests
	// never depend on a real picker.
	DateRangeField: TestDateRangeField,
	ArrayField: TestArrayField,
} satisfies AllFormFieldSlots

/** The test kit's `<form>` element — the `FormElement` option. */
export function testFormElement({ children, ...rest }: FormElementProps): ReactNode {
	return (
		<form
			data-testkit='form'
			{...rest}
		>
			{children}
		</form>
	)
}

/**
 * The submit button, built the way a kit builds one: on `form.Submit`, reading the form from
 * context, so it works as `form.SubmitButton` and as a plain component alike.
 */
function SubmitButton({ children, disabled }: SubmitButtonProps): ReactNode {
	const form = useFormContext()
	return (
		<form.Submit>
			{({ canSubmit, isSubmitting }) => (
				<button
					data-testkit='button'
					type='submit'
					disabled={disabled === true || !canSubmit || isSubmitting}
				>
					{children}
				</button>
			)}
		</form.Submit>
	)
}

/** The test kit's `components`. */
export const testComponents = {
	SubmitButton,
	Section,
	Grid,
} satisfies FormComponents

/**
 * A field component that renders nothing and records every props object it receives — for the
 * tests that assert what reaches a kit, prop by prop, rather than what a kit made of it.
 *
 * Its parameter is an open bag, so it fits every built-in slot and `form.<Field>` accepts any prop
 * beside the binding: exactly the stand-in for "a kit that declares whatever the test writes".
 */
export function captureField(): {
	calls: Record<string, unknown>[]
	last: () => Record<string, unknown> | undefined
	Capture: (props: Record<string, unknown>) => ReactNode
} {
	const calls: Record<string, unknown>[] = []
	return {
		calls,
		last: () => calls.at(-1),
		Capture: (props) => {
			calls.push(props)
			return null
		},
	}
}
