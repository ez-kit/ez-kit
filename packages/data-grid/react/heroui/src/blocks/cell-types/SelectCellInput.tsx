'use client'

import { ListBox, Select } from '@heroui/react'

import type { CellInputProps } from '@ez-kit/data-grid-react'

const ALL_SENTINEL = '__all__'

export function SelectCellInput({ value, onChange, cellConfig }: CellInputProps) {
	const items = (cellConfig?.items as { value: string; label: string }[] | undefined) ?? []
	const selectValue = value != null && value !== '' ? String(value) : ALL_SENTINEL

	return (
		<Select
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			selectedKey={selectValue}
			aria-label='Select value'
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			onSelectionChange={(key) => {
				if (key != null) onChange(String(key) === ALL_SENTINEL ? undefined : String(key))
			}}
		>
			<Select.Trigger>
				<Select.Value />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					<ListBox.Item
						id={ALL_SENTINEL}
						textValue='All'
					>
						All
					</ListBox.Item>
					{items.map((item) => (
						<ListBox.Item
							key={item.value}
							id={item.value}
							textValue={item.label}
						>
							{item.label}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}
