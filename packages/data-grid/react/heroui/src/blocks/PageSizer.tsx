'use client'

import { ListBox, Select } from '@heroui/react'

import type { PageSizerProps } from '@ez-kit/data-grid-react'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<Select
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			selectedKey={String(pageSize)}
			aria-label='Rows per page'
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			onSelectionChange={(key) => {
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
