'use client'

import { Checkbox as HeroUiCheckbox } from '@heroui/react'

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
			{/* Control only — a selection checkbox has no visible label, it is named by
			 * `aria-label` from the caller. (HeroUI's docs example ships a `Checkbox.Content`
			 * label; rendering one here printed that sample text next to every checkbox.) */}
			<HeroUiCheckbox.Control>
				<HeroUiCheckbox.Indicator />
			</HeroUiCheckbox.Control>
		</HeroUiCheckbox>
	)
}
