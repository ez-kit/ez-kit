'use client'

import { Checkbox as HeroUiCheckbox, Label } from '@heroui/react'

import type { CheckboxProps } from '@ez-kit/data-grid-react'

export function Checkbox({ value, indeterminate, disabled, onChange, 'aria-label': ariaLabel }: CheckboxProps) {
	return (
		<HeroUiCheckbox
			aria-label={ariaLabel ?? ''}
			isIndeterminate={indeterminate ?? false}
			isSelected={value ?? false}
			isDisabled={disabled ?? false}
			slot='selection'
			onChange={(value) => {
				onChange?.(value)
			}}
		>
			<HeroUiCheckbox.Control>
				<HeroUiCheckbox.Indicator />
			</HeroUiCheckbox.Control>
			<HeroUiCheckbox.Content>
				<Label htmlFor='default-notifications'>Enable email notifications</Label>
			</HeroUiCheckbox.Content>
		</HeroUiCheckbox>
	)
}
