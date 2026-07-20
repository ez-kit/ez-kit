import type { FieldRenderProps, FormComponents } from './contract'
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
	SelectField: ({ value, onChange, options, placeholder, id, name, onBlur, disabled, required, ...field }) => (
		<Shell
			id={id}
			{...field}
		>
			{(aria) => (
				<select
					data-testkit='select'
					id={id}
					name={name}
					disabled={disabled}
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
}
