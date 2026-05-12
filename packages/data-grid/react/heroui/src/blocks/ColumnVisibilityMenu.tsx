'use client'

import { ListBox, Popover } from '@heroui/react'
import { Columns2 } from 'lucide-react'

import type { ColumnVisibilityMenuProps } from '@ez-kit/data-grid-react'
import type { Selection } from '@heroui/react'

export function ColumnVisibilityMenu({ columns }: ColumnVisibilityMenuProps) {
	const selectedColumns = new Set(columns.filter((col) => col.isVisible).map((col) => col.id))

	return (
		<Popover>
			<Popover.Trigger>
				<span className='inline-flex items-center gap-1.5 cursor-pointer'>
					<Columns2 size={16} />
					Columns
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog aria-label='Column visibility'>
					<ListBox
						aria-label='Column visibility'
						selectionMode='multiple'
						selectedKeys={selectedColumns}
					>
						{columns.map((col) => (
							<ListBox.Item
								key={col.id}
								id={col.id}
								textValue={col.label}
								onPress={() => {
									col.onToggle()
								}}
							>
								{col.label}
								<ListBox.ItemIndicator />
							</ListBox.Item>
						))}
					</ListBox>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
