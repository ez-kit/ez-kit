import { Checkbox as ShadcnCheckbox } from '@grid-shadcn/components/ui/checkbox'

import type { CheckboxProps } from '@ez-kit/data-grid-react'

export function Checkbox({ value, indeterminate, disabled, onChange, 'aria-label': ariaLabel }: CheckboxProps) {
	const checked: boolean | 'indeterminate' = indeterminate ? 'indeterminate' : (value ?? false)

	return (
		<ShadcnCheckbox
			// A selection checkbox renders no visible label, so this is its only accessible
			// name — `selection.selectRow` / `selection.selectAll` from the dictionary. Dropping
			// it left every checkbox in the kit nameless.
			aria-label={ariaLabel}
			checked={checked}
			disabled={disabled}
			onCheckedChange={(value) => {
				onChange?.(value as boolean)
			}}
		/>
	)
}
