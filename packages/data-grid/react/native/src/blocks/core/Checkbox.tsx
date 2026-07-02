import type { CheckboxProps } from '@ez-kit/data-grid-react'

export function Checkbox({ value, indeterminate, onChange, ...rest }: CheckboxProps) {
	return (
		<input
			type='checkbox'
			checked={value}
			ref={(el) => {
				if (el) el.indeterminate = indeterminate ?? false
			}}
			onChange={(e) => onChange?.(e.target.checked)}
			{...rest}
		/>
	)
}
