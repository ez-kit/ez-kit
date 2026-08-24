import type { GlobalFilterInputProps } from '@ez-kit/data-grid-react'

export function GlobalFilterInput({ value, onChange, placeholder, onKeyDown }: GlobalFilterInputProps) {
	return (
		<input
			type='search'
			role='searchbox'
			aria-label={placeholder ?? 'Search'}
			placeholder={placeholder}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
			{...(onKeyDown ? { onKeyDown } : {})}
		/>
	)
}
