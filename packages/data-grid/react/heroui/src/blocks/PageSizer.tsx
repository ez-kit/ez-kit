'use client'

import { ListBox, Select } from '@heroui/react'

import type { PageSizerProps } from '@ez-kit/data-grid-react'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<div className='flex items-center gap-2'>
			<span className='dg-page-sizer-label text-sm whitespace-nowrap'>
				Rows per page
			</span>
			<Select
				value={String(pageSize)}
				aria-label='Rows per page'
				className='w-20'
				onChange={(key) => {
					if (key != null) onPageSizeChange(Number(key))
				}}
			>
				<Select.Trigger>
					<Select.Value />
					<Select.Indicator />
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
								<ListBox.ItemIndicator />
							</ListBox.Item>
						))}
					</ListBox>
				</Select.Popover>
			</Select>
		</div>
	)
}
