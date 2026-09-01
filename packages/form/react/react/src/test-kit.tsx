import { useState } from 'react'

import type {
	DateRangeFieldRenderProps,
	FieldRenderProps,
	FormComponents,
	GridItemRenderProps,
	SectionRenderProps,
	WizardRenderProps,
	WizardStep,
} from './contract'
import type { ReactNode } from 'react'

/**
 * A minimal, deliberately unstyled kit used by this package's own tests.
 *
 * It exists to prove the injection contract end to end without dragging in shadcn or
 * HeroUI. Every element stamps a `data-testkit` marker so a test can assert that the
 * *injected* component rendered rather than something built in — this package ships no
 * visible elements of its own.
 */

/** Suffixes the kit appends to the field id to build the ids `aria-describedby` points at. */
const DESCRIPTION_ID_SUFFIX = '-description'
const ERROR_ID_SUFFIX = '-error'

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
function Section({ title, description, columns, children }: SectionRenderProps): ReactNode {
	return (
		<section
			data-testid='section'
			data-columns={columns}
		>
			{title !== undefined && <h3>{title}</h3>}
			{description !== undefined && <p>{description}</p>}
			{children}
		</section>
	)
}

function GridItem({ colSpan, children }: GridItemRenderProps): ReactNode {
	return (
		<div
			data-testid='grid-item'
			data-col-span={colSpan}
		>
			{children}
		</div>
	)
}

function WizardStepTrigger({ index, title, description, status, invalid, disabled, goTo }: WizardStep): ReactNode {
	return (
		<li
			data-testid='wizard-step'
			data-status={status}
			data-invalid={invalid || undefined}
			aria-current={status === 'current' ? 'step' : undefined}
		>
			<button
				data-testkit='wizard-step-trigger'
				type='button'
				disabled={disabled}
				onClick={goTo}
			>
				{title ?? `Step ${String(index + 1)}`}
			</button>
			{description !== undefined && <p data-testkit='wizard-step-description'>{description}</p>}
		</li>
	)
}

function Wizard({
	steps,
	currentIndex,
	canGoBack,
	canGoNext,
	isLastStep,
	goNext,
	goBack,
	submitting,
	children,
}: WizardRenderProps): ReactNode {
	return (
		<div
			data-testkit='wizard'
			data-current-index={currentIndex}
		>
			<ol data-testkit='wizard-steps'>
				{steps.map((step) => (
					<WizardStepTrigger
						key={step.index}
						{...step}
					/>
				))}
			</ol>
			<div data-testkit='wizard-body'>{children}</div>
			<div data-testkit='wizard-nav'>
				<button
					data-testkit='wizard-back'
					type='button'
					disabled={!canGoBack || submitting}
					onClick={goBack}
				>
					Back
				</button>
				<button
					data-testkit='wizard-next'
					type='button'
					disabled={!canGoNext || submitting}
					onClick={goNext}
				>
					{isLastStep ? 'Review' : 'Next'}
				</button>
			</div>
		</div>
	)
}

/**
 * The range stand-in keeps its own half-picked state, exactly as the real kits do: the
 * contract reports a range only once **both** ends are set, so the end a user has already
 * typed has nowhere else to live while the other one is still empty.
 */
function TestDateRangeField({
	value,
	onChange,
	min,
	max,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: DateRangeFieldRenderProps): ReactNode {
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

export const testComponents: FormComponents = {
	TextField: ({ value, onChange, type, placeholder, id, name, onBlur, disabled, required, ...field }) => (
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
	NumberField: ({ value, onChange, placeholder, min, max, step, id, name, onBlur, disabled, required, ...field }) => (
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
	TextareaField: ({ value, onChange, placeholder, rows, id, name, onBlur, disabled, required, ...field }) => (
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
	}) => (
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
					<select
						data-testkit='select'
						data-loading={loading || undefined}
						id={id}
						name={name}
						disabled={disabled === true || loading}
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
	SliderField: ({ value, onChange, min, max, step, id, name, onBlur, disabled, required, ...field }) => (
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
	DateField: ({ value, onChange, placeholder, min, max, id, name, onBlur, disabled, required, ...field }) => (
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
		placeholder,
		id,
		name,
		onBlur,
		disabled,
		required,
		...field
	}) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<select
					data-testkit='multiselect'
					data-loading={loading || undefined}
					multiple
					id={id}
					name={name}
					disabled={disabled === true || loading}
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
	DateRangeField: (props) => <TestDateRangeField {...props} />,
	Button: ({ type, disabled, children }) => (
		<button
			data-testkit='button'
			type={type === 'submit' ? 'submit' : 'button'}
			disabled={disabled}
		>
			{children}
		</button>
	),
	Form: ({ children, ...rest }) => (
		<form
			data-testkit='form'
			{...rest}
		>
			{children}
		</form>
	),
	Section,
	GridItem,
	Wizard,
}
