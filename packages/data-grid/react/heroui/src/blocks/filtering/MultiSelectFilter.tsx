'use client'

import { ListBox, Select } from '@heroui/react'

import type { MultiSelectFilterProps } from '@ez-kit/data-grid-react'
import type { Key } from '@heroui/react'

const ROW_STYLE = {
	display: 'flex',
	alignItems: 'center',
	gap: '0.5rem',
	width: '100%',
} as const

const COUNT_STYLE = {
	marginLeft: 'auto',
	fontVariantNumeric: 'tabular-nums' as const,
	opacity: 0.6,
}

export function MultiSelectFilter({ options, selectedValues, onChange, placeholder }: MultiSelectFilterProps) {
	const handleChange = (next: Key | Key[] | null): void => {
		if (next == null) {
			onChange([])
			return
		}
		const keys = Array.isArray(next) ? next : [next]
		onChange(keys.map(String))
	}

	return (
		<Select
			aria-label={placeholder ?? 'Filter'}
			placeholder={placeholder ?? 'Select…'}
			selectionMode='multiple'
			value={selectedValues}
			onChange={handleChange}
		>
			<Select.Trigger>
				<Select.Value>
					{({ defaultChildren, isPlaceholder }) => {
						if (isPlaceholder || selectedValues.length === 0) return defaultChildren
						if (selectedValues.length === 1) {
							return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
						}
						return `${String(selectedValues.length)} selected`
					}}
				</Select.Value>
				<Select.Indicator />
			</Select.Trigger>
			<Select.Popover>
				<ListBox selectionMode='multiple'>
					{options.map((opt) => (
						<ListBox.Item
							key={opt.value}
							id={opt.value}
							textValue={opt.label}
						>
							<div style={ROW_STYLE}>
								<span>{opt.label}</span>
								{opt.count !== undefined && (
									<span
										data-slot='count'
										style={COUNT_STYLE}
									>
										{opt.count}
									</span>
								)}
							</div>
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}
