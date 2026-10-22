'use client'

import { buildMultiSelectLabel } from '@ez-kit/data-grid-react/kit'
import { ListBox, Select } from '@heroui/react'

import { KIT_CLASS_NAME } from '../../lib/kit-class-name'
import { ItemsListState, ListStateAnnouncer, useEmptyListLabel } from '../items-list-state'

import type { MultiSelectFilterProps } from '@ez-kit/data-grid-react'
import type { Key } from '@heroui/react'
import type { ReactNode } from 'react'

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

export function MultiSelectFilter({
	items,
	selectedValues,
	onChange,
	label,
	placeholder,
	itemsLoading: isLoading,
	itemsError: error,
}: MultiSelectFilterProps) {
	// The user's own selection outranks the list's state: it stays readable while the list reloads.
	const emptyListLabel = useEmptyListLabel(selectedValues.length > 0 ? 1 : items.length, isLoading === true, error)
	const handleChange = (next: Key | Key[] | null): void => {
		if (next == null) {
			onChange([])
			return
		}
		const keys = Array.isArray(next) ? next : [next]
		onChange(keys.map(String))
	}

	return (
		<>
			<Select
				aria-label={label ?? placeholder ?? 'Filter'}
				placeholder={placeholder ?? 'Select…'}
				selectionMode='multiple'
				value={selectedValues}
				onChange={handleChange}
			>
				<Select.Trigger>
					<Select.Value>
						{({ defaultChildren, isPlaceholder }) => {
							if (emptyListLabel !== undefined) return <span data-slot='multi-select-state'>{emptyListLabel}</span>
							if (isPlaceholder || selectedValues.length === 0) return defaultChildren
							return buildMultiSelectLabel(items, selectedValues, placeholder)
						}}
					</Select.Value>
					<Select.Indicator />
				</Select.Trigger>
				<Select.Popover className={KIT_CLASS_NAME}>
					<ItemsListState
						isLoading={isLoading === true}
						error={error}
					/>
					<ListBox
						selectionMode='multiple'
						aria-busy={isLoading === true || undefined}
					>
						{items.map((opt) => (
							<ListBox.Item
								key={opt.value}
								id={opt.value}
								textValue={opt.label}
							>
								<div style={ROW_STYLE}>
									<span>
										{(opt.icon as ReactNode) ?? null}
										{opt.label}
									</span>
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
			<ListStateAnnouncer
				isLoading={isLoading === true}
				error={error}
			/>
		</>
	)
}
