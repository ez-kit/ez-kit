'use client'

import { Search } from 'lucide-react'

import { Input } from '../../components/ui/input'

import type { GlobalFilterInputProps } from '@ez-kit/data-grid-react'

/**
 * Shadcn search field for the data-grid global filter.
 *
 * Renders a controlled input wrapped with a leading search icon. The wrapping
 * `<DataGrid.GlobalFilterInput />` already holds the draft state and applies the
 * configured debounce — this component is purely visual.
 */
export function GlobalFilterInput({ value, onChange, placeholder, onKeyDown }: GlobalFilterInputProps) {
	return (
		<div
			className='relative w-56'
			data-slot='global-filter-input'
		>
			<Search
				className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground'
				aria-hidden='true'
			/>
			<Input
				type='search'
				role='searchbox'
				aria-label={placeholder ?? 'Search'}
				placeholder={placeholder}
				value={value}
				onChange={(event) => {
					onChange(event.target.value)
				}}
				className='pl-7'
				{...(onKeyDown ? { onKeyDown } : {})}
			/>
		</div>
	)
}
