import { Checkbox as CheckboxPrimitive } from '@form-shadcn/components/ui/checkbox'
import { Input } from '@form-shadcn/components/ui/input'
import { Label } from '@form-shadcn/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@form-shadcn/components/ui/radio-group'
import { Slider as SliderPrimitive } from '@form-shadcn/components/ui/slider'
import { Switch as SwitchPrimitive } from '@form-shadcn/components/ui/switch'
import { Textarea as TextareaPrimitive } from '@form-shadcn/components/ui/textarea'

import { FieldShell, splitChrome } from './field-shell'
import { OptionListSkeleton } from './option-skeleton'

import type { ControlProps } from './field-shell'
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
 *
 * Each also takes **kit props** beyond the contract — `<Field>KitProps`, the props of the control
 * it renders: a native `<input>` / `<textarea>` for the text kinds, the vendored Radix primitive
 * for the rest. They arrive flat from `form.<Field>` and are spread onto that control *first*, so
 * every computed prop (`id`, `name`, `value`, `aria-invalid`, …) is written after them and wins.
 */

/** A text field's kit props: the native `<input>` attributes — `type`, `placeholder`, `autoComplete`, … */
export type TextFieldKitProps = ControlProps<'input', TextFieldRenderProps>

/** A number field's kit props: the native `<input>` attributes but `type`, which is always `number`. */
export type NumberFieldKitProps = ControlProps<'input', NumberFieldRenderProps, 'type'>

/** A textarea field's kit props: the native `<textarea>` attributes — `rows`, `placeholder`, `maxLength`, … */
export type TextareaFieldKitProps = ControlProps<'textarea', TextareaFieldRenderProps>

/** A checkbox field's kit props: the vendored Radix checkbox's own. */
export type CheckboxFieldKitProps = ControlProps<typeof CheckboxPrimitive, CheckboxFieldRenderProps, 'onCheckedChange'>

/** A switch field's kit props: the vendored Radix switch's own. */
export type SwitchFieldKitProps = ControlProps<typeof SwitchPrimitive, SwitchFieldRenderProps, 'onCheckedChange'>

/** A radio-group field's kit props: the vendored Radix radio group's own. */
export type RadioGroupFieldKitProps = ControlProps<typeof RadioGroup, RadioGroupFieldRenderProps, 'onValueChange'>

/** A slider field's kit props: the vendored Radix slider's own — `min`, `max`, `step`, … */
export type SliderFieldKitProps = ControlProps<typeof SliderPrimitive, SliderFieldRenderProps, 'onValueChange'>

export function TextField(props: TextFieldRenderProps & TextFieldKitProps): ReactNode {
	const {
		chrome,
		control: { value, onChange, type, ...input },
	} = splitChrome(props)

	return (
		<FieldShell
			id={input.id}
			{...chrome}
		>
			{(binding) => (
				<Input
					{...input}
					type={type ?? 'text'}
					aria-invalid={chrome.invalid}
					value={value}
					onChange={(event) => {
						onChange(event.target.value)
					}}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function NumberField(props: NumberFieldRenderProps & NumberFieldKitProps): ReactNode {
	const {
		chrome,
		control: { value, onChange, ...input },
	} = splitChrome(props)

	return (
		<FieldShell
			id={input.id}
			{...chrome}
		>
			{(binding) => (
				<Input
					// The kit's default keyboard, ahead of the author's attributes so `inputMode` overrides it.
					inputMode='decimal'
					{...input}
					type='number'
					aria-invalid={chrome.invalid}
					// An empty numeric control has no number; `''` keeps the input controlled while
					// the form state holds `undefined`.
					value={value ?? ''}
					onChange={(event) => {
						onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
					}}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function TextareaField(props: TextareaFieldRenderProps & TextareaFieldKitProps): ReactNode {
	const {
		chrome,
		control: { value, onChange, ...textarea },
	} = splitChrome(props)

	return (
		<FieldShell
			id={textarea.id}
			{...chrome}
		>
			{(binding) => (
				<TextareaPrimitive
					{...textarea}
					aria-invalid={chrome.invalid}
					value={value}
					onChange={(event) => {
						onChange(event.target.value)
					}}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function CheckboxField(props: CheckboxFieldRenderProps & CheckboxFieldKitProps): ReactNode {
	const {
		chrome,
		control: { checked, onChange, disabled, required, ...checkbox },
	} = splitChrome(props)

	return (
		<FieldShell
			controlFirst
			id={checkbox.id}
			{...chrome}
		>
			{(binding) => (
				<CheckboxPrimitive
					{...checkbox}
					// Radix's checkbox types `required` as a plain `boolean`, which under
					// `exactOptionalPropertyTypes` rejects an explicit `undefined`.
					{...(disabled !== undefined ? { disabled } : {})}
					{...(required !== undefined ? { required } : {})}
					aria-invalid={chrome.invalid}
					checked={checked}
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

export function SwitchField(props: SwitchFieldRenderProps & SwitchFieldKitProps): ReactNode {
	const {
		chrome,
		control: { checked, onChange, disabled, required, ...switchProps },
	} = splitChrome(props)

	return (
		<FieldShell
			controlFirst
			id={switchProps.id}
			{...chrome}
		>
			{(binding) => (
				<SwitchPrimitive
					{...switchProps}
					// Radix types `disabled`/`required` as plain booleans, which under
					// `exactOptionalPropertyTypes` reject an explicit `undefined`.
					{...(disabled !== undefined ? { disabled } : {})}
					{...(required !== undefined ? { required } : {})}
					aria-invalid={chrome.invalid}
					checked={checked}
					onCheckedChange={onChange}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}

export function RadioGroupField(props: RadioGroupFieldRenderProps & RadioGroupFieldKitProps): ReactNode {
	const {
		chrome,
		control: { value, onChange, options, loading, id, disabled, required, ...group },
	} = splitChrome(props)
	// See the checkbox group in `multi-value.tsx` — same reasoning, same placeholder rows.
	const controlDisabled = loading ? true : disabled

	return (
		<FieldShell
			id={id}
			{...chrome}
		>
			{(binding) => (
				<RadioGroup
					{...group}
					id={id}
					data-loading={loading || undefined}
					aria-busy={loading || undefined}
					// Radix reserves `''` for "no selection", and under `exactOptionalPropertyTypes` an
					// explicit `undefined` is rejected — so an empty form value omits the key entirely.
					{...(value === '' ? {} : { value })}
					{...(controlDisabled !== undefined ? { disabled: controlDisabled } : {})}
					{...(required !== undefined ? { required } : {})}
					aria-invalid={chrome.invalid}
					onValueChange={onChange}
					{...binding}
				>
					{loading && <OptionListSkeleton />}
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

export function SliderField(props: SliderFieldRenderProps & SliderFieldKitProps): ReactNode {
	const {
		chrome,
		control: {
			value,
			onChange,
			disabled,
			// Radix's Slider has no `required` prop — a slider always holds a value — so the flag is
			// dropped here rather than forwarded to the primitive.
			required: _required,
			...slider
		},
	} = splitChrome(props)

	return (
		<FieldShell
			id={slider.id}
			{...chrome}
		>
			{(binding) => (
				<SliderPrimitive
					{...slider}
					// Radix types `disabled` as a plain boolean, which under `exactOptionalPropertyTypes`
					// rejects an explicit `undefined`.
					{...(disabled !== undefined ? { disabled } : {})}
					aria-invalid={chrome.invalid}
					// Radix models the multi-thumb range as an array; the contract is a single number.
					value={[value]}
					onValueChange={(next) => {
						onChange(next[0] ?? value)
					}}
					{...binding}
				/>
			)}
		</FieldShell>
	)
}
