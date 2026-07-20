import { Checkbox as CheckboxPrimitive } from '@form-shadcn/components/ui/checkbox'
import { Input } from '@form-shadcn/components/ui/input'
import { Textarea as TextareaPrimitive } from '@form-shadcn/components/ui/textarea'

import { FieldShell } from './field-shell'

import type {
	CheckboxFieldRenderProps,
	NumberFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
} from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The value-carrying fields of the shadcn kit.
 *
 * Each one translates the contract's props (`value`/`onChange` carrying the value itself,
 * `invalid`) into what the vendored primitive expects (DOM events, `aria-invalid`), and
 * wraps the result in the kit's own {@link FieldShell} chrome.
 */

export function TextField({
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
}: TextFieldRenderProps): ReactNode {
	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<Input
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
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function NumberField({
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
}: NumberFieldRenderProps): ReactNode {
	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<Input
					id={id}
					name={name}
					type='number'
					inputMode='decimal'
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
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function TextareaField({
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
}: TextareaFieldRenderProps): ReactNode {
	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<TextareaPrimitive
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
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function CheckboxField({
	checked,
	onChange,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: CheckboxFieldRenderProps): ReactNode {
	return (
		<FieldShell
			controlFirst
			id={id}
			{...field}
		>
			{(binding) => (
				<CheckboxPrimitive
					id={id}
					name={name}
					// Radix's checkbox types `required` as a plain `boolean`, which under
					// `exactOptionalPropertyTypes` rejects an explicit `undefined`.
					{...(disabled !== undefined ? { disabled } : {})}
					{...(required !== undefined ? { required } : {})}
					aria-invalid={field.invalid}
					checked={checked}
					onBlur={onBlur}
					onCheckedChange={(next) => {
						// Radix models the tri-state 'indeterminate'; the contract is strictly boolean.
						onChange(next === true)
					}}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}
