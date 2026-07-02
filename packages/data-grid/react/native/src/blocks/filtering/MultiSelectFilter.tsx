import type { MultiSelectFilterProps } from '@ez-kit/data-grid-react'

export function MultiSelectFilter({ options, selectedValues, onChange, placeholder }: MultiSelectFilterProps) {
	const toggle = (value: string): void => {
		const next = selectedValues.includes(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value]
		onChange(next)
	}
	return (
		<div
			role='group'
			aria-label={placeholder ?? 'Filter'}
			style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
		>
			{options.map((opt) => (
				<label
					key={opt.value}
					style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
				>
					<input
						type='checkbox'
						checked={selectedValues.includes(opt.value)}
						onChange={() => {
							toggle(opt.value)
						}}
					/>
					<span>{opt.label}</span>
					{opt.count !== undefined && <span data-slot='count'>{opt.count}</span>}
				</label>
			))}
		</div>
	)
}
