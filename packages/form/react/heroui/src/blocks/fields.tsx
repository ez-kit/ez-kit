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
import { fieldRoot, splitRootState } from './field-state'
import { OptionListSkeleton } from './option-skeleton'

import type { RootProps } from './field-state'
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
 *
 * Each also takes **kit props** beyond the contract — `<Field>KitProps`: the props of its React
 * Aria root, which is where React Aria takes `type`, `autoComplete`, `inputMode`, `maxLength` and
 * the rest of an input's attributes, plus the few it does not take there (`placeholder`, `rows`),
 * which the field puts on the element itself. Bounds keep the contract's names, `min` / `max`,
 * and are mapped onto React Aria's `minValue` / `maxValue`. The root props are spread *first*, so
 * every computed prop is written after them and wins.
 */

/** A text field's kit props: the React Aria `TextField` root's — `type`, `autoComplete`, … — and the input's `placeholder`. */
export type TextFieldKitProps = RootProps<typeof HeroTextField, TextFieldRenderProps> & {
	placeholder?: string | undefined
}

/** A number field's kit props: the React Aria `NumberField` root's, the bounds, and the input's `placeholder`. */
export type NumberFieldKitProps = RootProps<typeof HeroNumberField, NumberFieldRenderProps, 'minValue' | 'maxValue'> & {
	placeholder?: string | undefined
	min?: number | undefined
	max?: number | undefined
}

/** A textarea field's kit props: the React Aria `TextField` root's, and the textarea's `placeholder` / `rows`. */
export type TextareaFieldKitProps = RootProps<typeof HeroTextField, TextareaFieldRenderProps, 'type'> & {
	placeholder?: string | undefined
	rows?: number | undefined
}

/** A checkbox field's kit props: the React Aria `Checkbox` root's. */
export type CheckboxFieldKitProps = RootProps<typeof HeroCheckbox, CheckboxFieldRenderProps>

/** A switch field's kit props: the React Aria `Switch` root's. */
export type SwitchFieldKitProps = RootProps<typeof HeroSwitch, SwitchFieldRenderProps>

/** A radio-group field's kit props: the React Aria `RadioGroup` root's. */
export type RadioGroupFieldKitProps = RootProps<typeof HeroRadioGroup, RadioGroupFieldRenderProps>

/** A slider field's kit props: the React Aria `Slider` root's — `step`, … — and the bounds. */
export type SliderFieldKitProps = RootProps<typeof HeroSlider, SliderFieldRenderProps, 'minValue' | 'maxValue'> & {
	min?: number | undefined
	max?: number | undefined
}

export function TextField(props: TextFieldRenderProps & TextFieldKitProps): ReactNode {
	const {
		state,
		rest: { value, onChange, placeholder, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		<HeroTextField
			{...root}
			value={value}
			onChange={onChange}
			name={name}
			{...fieldRoot(state)}
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
				invalid={state.invalid}
			/>
		</HeroTextField>
	)
}

export function NumberField(props: NumberFieldRenderProps & NumberFieldKitProps): ReactNode {
	const {
		state,
		rest: { value, onChange, placeholder, min, max, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		<HeroNumberField
			{...root}
			onChange={onChange}
			name={name}
			// An empty numeric control has no number, and React Aria reads an explicit
			// `undefined` differently from an absent prop under `exactOptionalPropertyTypes`.
			{...(value !== undefined ? { value } : {})}
			{...(min !== undefined ? { minValue: min } : {})}
			{...(max !== undefined ? { maxValue: max } : {})}
			{...fieldRoot(state)}
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
				invalid={state.invalid}
			/>
		</HeroNumberField>
	)
}

export function TextareaField(props: TextareaFieldRenderProps & TextareaFieldKitProps): ReactNode {
	const {
		state,
		rest: { value, onChange, placeholder, rows, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		// The multi-line control is a bare primitive in HeroUI; `TextField` supplies the
		// value, validation state and change handling around it.
		<HeroTextField
			{...root}
			value={value}
			onChange={onChange}
			name={name}
			{...fieldRoot(state)}
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
				invalid={state.invalid}
			/>
		</HeroTextField>
	)
}

export function CheckboxField(props: CheckboxFieldRenderProps & CheckboxFieldKitProps): ReactNode {
	const {
		state,
		rest: { checked, onChange, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		// The checkbox root is the row: control first, then `Checkbox.Content` — the column
		// holding label and description. That is HeroUI's own anatomy, and it is why this kit
		// no longer needs CSS `order` tricks to get `[control] Label` reading order.
		<HeroCheckbox
			{...root}
			id={id}
			name={name}
			isSelected={checked}
			onChange={onChange}
			onBlur={onBlur}
			{...fieldRoot(state)}
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
				invalid={state.invalid}
			/>
		</HeroCheckbox>
	)
}

export function SwitchField(props: SwitchFieldRenderProps & SwitchFieldKitProps): ReactNode {
	const {
		state,
		rest: { checked, onChange, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		// HeroUI's Switch anatomy: `Switch.Content` is the clickable label wrapping the control
		// track and the label text; `Description`/`FieldError` sit beside it as field-level rows.
		<HeroSwitch
			{...root}
			id={id}
			name={name}
			isSelected={checked}
			onChange={onChange}
			onBlur={onBlur}
			{...fieldRoot(state)}
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
				invalid={state.invalid}
			/>
		</HeroSwitch>
	)
}

export function RadioGroupField(props: RadioGroupFieldRenderProps & RadioGroupFieldKitProps): ReactNode {
	const {
		state,
		rest: { value, onChange, options, loading, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		// The group root owns value/validation; label and description are its leading children,
		// each `Radio` its own control + label, and `FieldError` the trailing group-level row.
		<HeroRadioGroup
			{...root}
			id={id}
			name={name}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			data-loading={loading || undefined}
			// See the checkbox group in `multi-value.tsx` — same reasoning, same placeholder rows.
			{...fieldRoot(loading ? { ...state, disabled: true } : state)}
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
				invalid={state.invalid}
			/>
		</HeroRadioGroup>
	)
}

export function SliderField(props: SliderFieldRenderProps & SliderFieldKitProps): ReactNode {
	const {
		state: { invalid, disabled, 'data-field': dataField, 'data-field-type': dataFieldType, 'data-form-id': dataFormId },
		rest: { value, onChange, min, max, id, name, onBlur, label, description, errors, ...root },
	} = splitRootState(props)

	return (
		// HeroUI's Slider anatomy: label and value output lead, then the track owns the fill and
		// the single thumb; description and error close the field. The thumb carries `name`/`onBlur`
		// because it is the focusable control React Aria wires the hidden form input to.
		//
		// React Aria's Slider models no `isRequired`/`isInvalid` — a slider always holds an in-range
		// value — so `required` is not forwarded and `fieldRoot` is not used.
		<HeroSlider
			{...root}
			id={id}
			value={value}
			data-field={dataField}
			data-field-type={dataFieldType}
			data-form-id={dataFormId}
			onChange={(next) => {
				// A single-thumb slider yields a number; the range form yields an array. The contract
				// binds one number, so collapse an array back to its first thumb.
				onChange(typeof next === 'number' ? next : (next[0] ?? value))
			}}
			{...(min !== undefined ? { minValue: min } : {})}
			{...(max !== undefined ? { maxValue: max } : {})}
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
