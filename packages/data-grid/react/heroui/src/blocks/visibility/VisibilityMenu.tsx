'use client'

import { Button, Dropdown, Label } from '@heroui/react'
import { Columns2 } from 'lucide-react'

import type { VisibilityMenuProps, VisibilityColumnItem } from '@ez-kit/data-grid-react'
import type { Selection } from '@heroui/react'

export function VisibilityMenu({ columns }: VisibilityMenuProps) {
	const selectedKeys = new Set(columns.filter((col) => col.isVisible).map((col) => col.id))

	/**
	 * react-aria reports the whole next selection rather than the item that was pressed, so toggle
	 * exactly the columns whose visibility flipped. `'all'` means every key is selected.
	 */
	const onSelectionChange = (keys: Selection) => {
		for (const col of columns) {
			const willBeVisible = keys === 'all' || keys.has(col.id)
			if (willBeVisible !== col.isVisible) col.onToggle()
		}
	}

	return (
		<Dropdown>
			<Button
				size='sm'
				variant='outline'
			>
				<Columns2 size={16} />
				Columns
			</Button>
			<Dropdown.Popover placement='bottom end'>
				<Dropdown.Menu
					aria-label='Column visibility'
					items={columns}
					selectedKeys={selectedKeys}
					selectionMode='multiple'
					onSelectionChange={onSelectionChange}
				>
					{(col: VisibilityColumnItem) => (
						<Dropdown.Item
							id={col.id}
							textValue={col.label}
						>
							<Label>{col.label}</Label>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
