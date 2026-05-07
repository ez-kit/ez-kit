'use client'

import { ListBox, Select } from '@heroui/react'

import type { PageSizerProps } from '@ez-kit/data-grid-react'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<div className='flex items-center gap-2'>
			<span
				className='text-sm whitespace-nowrap'
				style={{ color: 'var(--heroui-default-500, #71717a)' }}
			>
				Rows per page
			</span>
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
		</div>
	)
}
