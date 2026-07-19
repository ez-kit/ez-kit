import { ListBox, Select as HeroSelect } from '@heroui/react'

import { ariaFieldState } from './field-state'

import type { SelectProps } from '@ez-kit/form-react'
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
 * value maps to `null` so the placeholder shows instead of a phantom selection.
 */
export function Select({ value, onChange, options, placeholder, name, id, onBlur, ...state }: SelectProps): ReactNode {
	return (
		<HeroSelect
			value={value === '' ? null : value}
			onChange={(next) => {
				onChange(toStringValue(next))
			}}
			name={name}
			{...(placeholder !== undefined ? { placeholder } : {})}
			{...ariaFieldState(state)}
		>
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
		</HeroSelect>
	)
}
