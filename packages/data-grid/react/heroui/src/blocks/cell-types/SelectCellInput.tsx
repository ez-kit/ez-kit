'use client'

import { Description, FieldError, Label, ListBox, Select } from '@heroui/react'

import type { FieldState, SelectCellConfig } from '@ez-kit/data-grid-react'

const ALL_SENTINEL = '__all__'

/**
 * Select / Badge cell input on HeroUI v3. Wraps `<Select>` (always rendered);
 * Label/Description/FieldError appear only when their data is set.
 */
export function SelectCellInput({
	id,
	value,
	onChange,
	onBlur,
	config,
	label,
	description,
	errors,
}: FieldState<SelectCellConfig>) {
	const hasError = errors.length > 0
	const items = config?.items ?? []
	const selectValue = value != null && value !== '' ? String(value) : ALL_SENTINEL
	return (
		<Select
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			selectedKey={selectValue}
			isInvalid={hasError}
			aria-label={label ?? 'Select value'}
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			onSelectionChange={(key) => {
				if (key != null) onChange(String(key) === ALL_SENTINEL ? undefined : String(key))
			}}
			onBlur={onBlur}
		>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Select.Trigger id={id}>
				<Select.Value />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					<ListBox.Item
						id={ALL_SENTINEL}
						textValue='All'
					>
						All
					</ListBox.Item>
					{items.map((item) => (
						<ListBox.Item
							key={item.value}
							id={item.value}
							textValue={item.label}
						>
							{item.label}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</Select>
	)
}
