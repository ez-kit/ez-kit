import { ListBox, Select as HeroSelect } from '@heroui/react'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'

import type { SelectFieldRenderProps } from '@ez-kit/form-react'
import type { Key } from '@heroui/react'
import type { ReactNode } from 'react'

/** React Aria reports "nothing selected" as `null`; the contract's value type is a string. */
function toStringValue(key: Key | Key[] | null): string {
	if (key === null || Array.isArray(key)) {
		return ''
	}

	return String(key)
}

/**
 * Adapts the contract's flat `options` list onto HeroUI's compound React Aria select.
 *
 * Options are `ListBox.Item`s keyed by `id` — that id *is* the form value. An empty form
 * value maps to `null` so the placeholder shows instead of a phantom selection. The chrome
 * follows HeroUI's anatomy: label above the trigger, description and error below the
 * popover, all inside the root so React Aria owns the wiring.
 */
export function SelectField({
	value,
	onChange,
	options,
	placeholder,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: SelectFieldRenderProps): ReactNode {
	return (
		<HeroSelect
			value={value === '' ? null : value}
			onChange={(next) => {
				onChange(toStringValue(next))
			}}
			name={name}
			{...(placeholder !== undefined ? { placeholder } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<HeroSelect.Trigger
				id={id}
				onBlur={onBlur}
			>
				<HeroSelect.Value />
				<HeroSelect.Indicator />
			</HeroSelect.Trigger>
			<HeroSelect.Popover>
				<ListBox>
					{options.map((option) => (
						<ListBox.Item
							key={option.value}
							id={option.value}
							textValue={option.label}
						>
							{option.label}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</HeroSelect.Popover>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroSelect>
	)
}
