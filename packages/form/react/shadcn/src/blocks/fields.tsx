import { Checkbox as CheckboxPrimitive } from '@form-shadcn/components/ui/checkbox'
import { Input } from '@form-shadcn/components/ui/input'
import { Label } from '@form-shadcn/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@form-shadcn/components/ui/radio-group'
import { Slider as SliderPrimitive } from '@form-shadcn/components/ui/slider'
import { Switch as SwitchPrimitive } from '@form-shadcn/components/ui/switch'
import { Textarea as TextareaPrimitive } from '@form-shadcn/components/ui/textarea'

import { FieldShell } from './field-shell'

import type {
	CheckboxFieldRenderProps,
	NumberFieldRenderProps,
	RadioGroupFieldRenderProps,
	SliderFieldRenderProps,
	SwitchFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
} from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/** Joins the field id and an option value into the per-radio-item id a `<label for>` targets. */
const RADIO_ITEM_ID_SEPARATOR = '-'

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

export function SwitchField({
	checked,
	onChange,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: SwitchFieldRenderProps): ReactNode {
	return (
		<FieldShell
			controlFirst
			id={id}
			{...field}
		>
			{(binding) => (
				<SwitchPrimitive
					id={id}
					name={name}
					// Radix types `disabled`/`required` as plain booleans, which under
					// `exactOptionalPropertyTypes` reject an explicit `undefined`.
					{...(disabled !== undefined ? { disabled } : {})}
					{...(required !== undefined ? { required } : {})}
					aria-invalid={field.invalid}
					checked={checked}
					onBlur={onBlur}
					onCheckedChange={onChange}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function RadioGroupField({
	value,
	onChange,
	options,
	id,
	name,
	onBlur,
	disabled,
	required,
	...field
}: RadioGroupFieldRenderProps): ReactNode {
	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<RadioGroup
					id={id}
					name={name}
					// Radix reserves `''` for "no selection", and under `exactOptionalPropertyTypes` an
					// explicit `undefined` is rejected — so an empty form value omits the key entirely.
					{...(value === '' ? {} : { value })}
					{...(disabled !== undefined ? { disabled } : {})}
					{...(required !== undefined ? { required } : {})}
					aria-invalid={field.invalid}
					onValueChange={onChange}
					onBlur={onBlur}
					{...binding}
				>
					{options.map((option) => {
						const itemId = `${id}${RADIO_ITEM_ID_SEPARATOR}${option.value}`
						return (
							<div
								key={option.value}
								className='flex items-center gap-2'
							>
								<RadioGroupItem
									id={itemId}
									value={option.value}
									{...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
								/>
								<Label htmlFor={itemId}>{option.label}</Label>
							</div>
						)
					})}
				</RadioGroup>
			)}
		</FieldShell>
	)
}

export function SliderField({
	value,
	onChange,
	min,
	max,
	step,
	id,
	name,
	onBlur,
	disabled,
	// Radix's Slider has no `required` prop — a slider always holds a value — so the flag is
	// dropped here rather than forwarded to the primitive.
	required: _required,
	...field
}: SliderFieldRenderProps): ReactNode {
	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<SliderPrimitive
					id={id}
					name={name}
					// Radix types `min`/`max`/`step`/`disabled` as plain values, which under
					// `exactOptionalPropertyTypes` reject an explicit `undefined`.
					{...(min !== undefined ? { min } : {})}
					{...(max !== undefined ? { max } : {})}
					{...(step !== undefined ? { step } : {})}
					{...(disabled !== undefined ? { disabled } : {})}
					aria-invalid={field.invalid}
					// Radix models the multi-thumb range as an array; the contract is a single number.
					value={[value]}
					onBlur={onBlur}
					onValueChange={(next) => {
						onChange(next[0] ?? value)
					}}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}
