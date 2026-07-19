import type { FormComponents } from './contract'

/**
 * A minimal, deliberately unstyled kit used by this package's own tests.
 *
 * It exists to prove the injection contract end to end without dragging in shadcn or
 * HeroUI. Every primitive stamps a `data-testkit` marker so a test can assert that the
 * *injected* component rendered rather than something built in — this package ships no
 * visible elements of its own.
 */
export const testComponents: FormComponents = {
	FieldRoot: ({ children, ...rest }) => (
		<div
			data-testkit='field-root'
			{...rest}
		>
			{children}
		</div>
	),
	Label: ({ htmlFor, id, children }) => (
		<label
			data-testkit='label'
			htmlFor={htmlFor}
			id={id}
		>
			{children}
		</label>
	),
	Description: ({ id, children }) => (
		<p
			data-testkit='description'
			id={id}
		>
			{children}
		</p>
	),
	ErrorText: ({ id, errors }) => (
		<p
			data-testkit='error'
			id={id}
			role='alert'
		>
			{errors.join(', ')}
		</p>
	),
	TextInput: ({ value, onChange, invalid, type, ...rest }) => (
		<input
			data-testkit='text-input'
			type={type ?? 'text'}
			aria-invalid={invalid}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
			{...rest}
		/>
	),
	NumberInput: ({ value, onChange, invalid, ...rest }) => (
		<input
			data-testkit='number-input'
			type='number'
			aria-invalid={invalid}
			value={value ?? ''}
			onChange={(event) => {
				onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
			}}
			{...rest}
		/>
	),
	Textarea: ({ value, onChange, invalid, ...rest }) => (
		<textarea
			data-testkit='textarea'
			aria-invalid={invalid}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
			{...rest}
		/>
	),
	Select: ({ value, onChange, options, placeholder, invalid, ...rest }) => (
		<select
			data-testkit='select'
			aria-invalid={invalid}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
			{...rest}
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
	),
	Checkbox: ({ checked, onChange, invalid, ...rest }) => (
		<input
			data-testkit='checkbox'
			type='checkbox'
			aria-invalid={invalid}
			checked={checked}
			onChange={(event) => {
				onChange(event.target.checked)
			}}
			{...rest}
		/>
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
