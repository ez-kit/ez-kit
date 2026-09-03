import {
	Checkbox as HeroCheckbox,
	Input,
	NumberField as HeroNumberField,
	Radio,
	RadioGroup as HeroRadioGroup,
	Slider as HeroSlider,
	Switch as HeroSwitch,
	TextArea,
	TextField as HeroTextField,
} from '@heroui/react'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'
import { OptionListSkeleton } from './option-skeleton'

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

/**
 * The value-carrying fields of the HeroUI v3 kit.
 *
 * Every one follows HeroUI's documented anatomy verbatim — `Label`, the control,
 * `Description`, `FieldError`, all children of the state-owning root. That is what earns
 * the kit's real spacing, focus and invalid styling instead of an approximation of it.
 */

export function TextField({
	value,
	onChange,
	type,
	placeholder,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: TextFieldRenderProps): ReactNode {
	return (
		<HeroTextField
			value={value}
			onChange={onChange}
			name={name}
			{...(type !== undefined ? { type } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<Input
				id={id}
				onBlur={onBlur}
				{...(placeholder !== undefined ? { placeholder } : {})}
			/>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroTextField>
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
	label,
	description,
	errors,
	...field
}: NumberFieldRenderProps): ReactNode {
	return (
		<HeroNumberField
			onChange={onChange}
			name={name}
			// An empty numeric control has no number, and React Aria reads an explicit
			// `undefined` differently from an absent prop under `exactOptionalPropertyTypes`.
			{...(value !== undefined ? { value } : {})}
			{...(min !== undefined ? { minValue: min } : {})}
			{...(max !== undefined ? { maxValue: max } : {})}
			{...(step !== undefined ? { step } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<HeroNumberField.Group>
				<HeroNumberField.DecrementButton />
				<HeroNumberField.Input
					id={id}
					onBlur={onBlur}
					{...(placeholder !== undefined ? { placeholder } : {})}
				/>
				<HeroNumberField.IncrementButton />
			</HeroNumberField.Group>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroNumberField>
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
	label,
	description,
	errors,
	...field
}: TextareaFieldRenderProps): ReactNode {
	return (
		// The multi-line control is a bare primitive in HeroUI; `TextField` supplies the
		// value, validation state and change handling around it.
		<HeroTextField
			value={value}
			onChange={onChange}
			name={name}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<TextArea
				id={id}
				onBlur={onBlur}
				{...(placeholder !== undefined ? { placeholder } : {})}
				{...(rows !== undefined ? { rows } : {})}
			/>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroTextField>
	)
}

export function CheckboxField({
	checked,
	onChange,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: CheckboxFieldRenderProps): ReactNode {
	return (
		// The checkbox root is the row: control first, then `Checkbox.Content` — the column
		// holding label and description. That is HeroUI's own anatomy, and it is why this kit
		// no longer needs CSS `order` tricks to get `[control] Label` reading order.
		<HeroCheckbox
			id={id}
			name={name}
			isSelected={checked}
			onChange={onChange}
			onBlur={onBlur}
			{...fieldRoot(field)}
		>
			<HeroCheckbox.Control>
				<HeroCheckbox.Indicator />
			</HeroCheckbox.Control>
			<HeroCheckbox.Content>
				<FieldLabel label={label} />
				<FieldDescription description={description} />
			</HeroCheckbox.Content>
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroCheckbox>
	)
}

export function SwitchField({
	checked,
	onChange,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: SwitchFieldRenderProps): ReactNode {
	return (
		// HeroUI's Switch anatomy: `Switch.Content` is the clickable label wrapping the control
		// track and the label text; `Description`/`FieldError` sit beside it as field-level rows.
		<HeroSwitch
			id={id}
			name={name}
			isSelected={checked}
			onChange={onChange}
			onBlur={onBlur}
			{...fieldRoot(field)}
		>
			<HeroSwitch.Content>
				<HeroSwitch.Control>
					<HeroSwitch.Thumb />
				</HeroSwitch.Control>
				<FieldLabel label={label} />
			</HeroSwitch.Content>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroSwitch>
	)
}

export function RadioGroupField({
	value,
	onChange,
	options,
	loading,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: RadioGroupFieldRenderProps): ReactNode {
	return (
		// The group root owns value/validation; label and description are its leading children,
		// each `Radio` its own control + label, and `FieldError` the trailing group-level row.
		<HeroRadioGroup
			id={id}
			name={name}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			data-loading={loading || undefined}
			// See the checkbox group in `multi-value.tsx` — same reasoning, same placeholder rows.
			{...fieldRoot(loading ? { ...field, disabled: true } : field)}
		>
			<FieldLabel label={label} />
			<FieldDescription description={description} />
			{loading && <OptionListSkeleton />}
			{options.map((option) => (
				<Radio
					key={option.value}
					value={option.value}
					{...(option.disabled !== undefined ? { isDisabled: option.disabled } : {})}
				>
					<Radio.Content>
						<Radio.Control>
							<Radio.Indicator />
						</Radio.Control>
						{option.label}
					</Radio.Content>
				</Radio>
			))}
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroRadioGroup>
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
	label,
	description,
	errors,
	invalid,
	disabled,
	// React Aria's Slider models no `isRequired`/`isInvalid` — a slider always holds an in-range
	// value — so those flags are not forwarded to the primitive.
	required: _required,
	'data-field': dataField,
	'data-field-type': dataFieldType,
}: SliderFieldRenderProps): ReactNode {
	return (
		// HeroUI's Slider anatomy: label and value output lead, then the track owns the fill and
		// the single thumb; description and error close the field. The thumb carries `name`/`onBlur`
		// because it is the focusable control React Aria wires the hidden form input to.
		<HeroSlider
			id={id}
			value={value}
			data-field={dataField}
			data-field-type={dataFieldType}
			onChange={(next) => {
				// A single-thumb slider yields a number; the range form yields an array. The contract
				// binds one number, so collapse an array back to its first thumb.
				onChange(typeof next === 'number' ? next : (next[0] ?? value))
			}}
			{...(min !== undefined ? { minValue: min } : {})}
			{...(max !== undefined ? { maxValue: max } : {})}
			{...(step !== undefined ? { step } : {})}
			{...(disabled !== undefined ? { isDisabled: disabled } : {})}
		>
			<FieldLabel label={label} />
			<HeroSlider.Output />
			<HeroSlider.Track>
				<HeroSlider.Fill />
				<HeroSlider.Thumb
					name={name}
					onBlur={onBlur}
				/>
			</HeroSlider.Track>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={invalid}
			/>
		</HeroSlider>
	)
}
