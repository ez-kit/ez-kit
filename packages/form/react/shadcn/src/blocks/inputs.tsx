import { Checkbox as CheckboxPrimitive } from '@form-shadcn/components/ui/checkbox'
import { Input } from '@form-shadcn/components/ui/input'
import { Textarea as TextareaPrimitive } from '@form-shadcn/components/ui/textarea'

import type { CheckboxProps, NumberInputProps, TextareaProps, TextInputProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Value-carrying inputs for the shadcn kit.
 *
 * Each adapter translates the kit-agnostic contract props (`value`/`onChange` carrying the
 * value itself, `invalid`) into what the vendored primitive expects (DOM events,
 * `aria-invalid`), so the shared field layer never touches a shadcn API.
 */

export function TextInput({ value, onChange, invalid, type, ...props }: TextInputProps): ReactNode {
	return (
		<Input
			type={type ?? 'text'}
			aria-invalid={invalid}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
			{...props}
		/>
	)
}

export function NumberInput({ value, onChange, invalid, ...props }: NumberInputProps): ReactNode {
	return (
		<Input
			type='number'
			inputMode='decimal'
			aria-invalid={invalid}
			// An empty numeric control has no number; `''` keeps the input controlled while
			// the form state holds `undefined`.
			value={value ?? ''}
			onChange={(event) => {
				onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
			}}
			{...props}
		/>
	)
}

export function Textarea({ value, onChange, invalid, ...props }: TextareaProps): ReactNode {
	return (
		<TextareaPrimitive
			aria-invalid={invalid}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
			{...props}
		/>
	)
}

export function Checkbox({ checked, onChange, invalid, ...props }: CheckboxProps): ReactNode {
	return (
		<CheckboxPrimitive
			aria-invalid={invalid}
			checked={checked}
			onCheckedChange={(next) => {
				// Radix models the tri-state 'indeterminate'; the contract is strictly boolean.
				onChange(next === true)
			}}
			{...props}
		/>
	)
}
