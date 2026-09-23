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
			{/* `Checkbox.Content` with no label — a selection checkbox has no visible text, it is
			 * named by `aria-label` from the caller. The wrapper is not optional: since HeroUI 3.2
			 * the root is React Aria's `CheckboxField` and `Content` is its `CheckboxButton`, so
			 * `Content` is the element that carries `role="checkbox"` and the focus behaviour.
			 * Rendering `Control` alone produced a grid with no checkbox in the tree at all. On
			 * 3.0 the root was RAC's `Checkbox` itself and `Control` alone was enough — which is
			 * why the earlier note here warned against `Content` (their docs example passes label
			 * text as its children, and that text then rendered beside every box). Passing no
			 * children is what makes it a control-only box. */}
			<HeroUiCheckbox.Content>
				<HeroUiCheckbox.Control>
					<HeroUiCheckbox.Indicator />
				</HeroUiCheckbox.Control>
			</HeroUiCheckbox.Content>
		</HeroUiCheckbox>
	)
}
