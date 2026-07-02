'use client'

import { SearchField } from '@heroui/react'

import type { GlobalFilterInputProps } from '@ez-kit/data-grid-react'

/**
 * HeroUI search field for the data-grid global filter.
 *
 * Uses HeroUI's `SearchField` compound with a leading search icon. The wrapping
 * `<DataGrid.GlobalFilterInput />` already holds the draft state and applies the
 * configured debounce — this component is purely visual.
 */
export function GlobalFilterInput({ value, onChange, placeholder }: GlobalFilterInputProps) {
	return (
		<SearchField
			aria-label={placeholder ?? 'Search'}
			value={value}
			onChange={onChange}
			data-slot='global-filter-input'
		>
			<SearchField.Group>
				<SearchField.SearchIcon />
				<SearchField.Input
					className='w-56'
					{...(placeholder !== undefined ? { placeholder } : {})}
				/>
			</SearchField.Group>
		</SearchField>
	)
}
