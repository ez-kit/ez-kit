'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'

import type { CellInputProps, SelectCellConfig } from '@ez-kit/data-grid-react'

const ALL_SENTINEL = '__all__'

export function SelectCellInput({ value, onChange, config }: CellInputProps<SelectCellConfig>) {
	const items = config?.items ?? []
	const selectValue = value != null && value !== '' ? String(value) : ALL_SENTINEL

	return (
		<Select
			value={selectValue}
			onValueChange={(v) => {
				onChange(v === ALL_SENTINEL ? undefined : v)
			}}
		>
			<SelectTrigger>
				<SelectValue placeholder='All' />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={ALL_SENTINEL}>All</SelectItem>
				{items.map((item) => (
					<SelectItem
						key={item.value}
						value={item.value}
					>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
