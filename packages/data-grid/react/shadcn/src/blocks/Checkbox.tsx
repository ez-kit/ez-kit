import { Checkbox as ShadcnCheckbox } from '@grid-shadcn/components/ui/checkbox'

import type { CheckboxProps } from '@ez-kit/data-grid-react'

export function Checkbox({ value, indeterminate, disabled, onChange }: CheckboxProps) {
	const checked: boolean | 'indeterminate' = indeterminate ? 'indeterminate' : (value ?? false)

	return (
		<ShadcnCheckbox
			checked={checked}
			disabled={disabled}
			onCheckedChange={(value) => {
				onChange?.(value as boolean)
			}}
		/>
	)
}
