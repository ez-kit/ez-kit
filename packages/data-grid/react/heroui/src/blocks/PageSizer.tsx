'use client'

import { ListBox, Select } from '@heroui/react'

import type { PageSizerProps } from '@ez-kit/data-grid-react'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<Select
			value={String(pageSize)}
			aria-label='Rows per page'
			onChange={(key) => {
				if (key != null) onPageSizeChange(Number(key))
			}}
		>
			<Select.Trigger>
				<Select.Value />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					{items.map((size) => (
						<ListBox.Item
							key={size}
							id={String(size)}
							textValue={String(size)}
						>
							{size}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}
