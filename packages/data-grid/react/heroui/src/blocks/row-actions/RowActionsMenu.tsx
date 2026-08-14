'use client'

import { RowActionId } from '@ez-kit/data-grid-react'
import { Button, Dropdown } from '@heroui/react'
import { ArrowDownToLine, ArrowUpToLine, MoreHorizontal, Pencil, PinOff, Trash2 } from 'lucide-react'

import type { RowActionItem, RowActionsMenuProps } from '@ez-kit/data-grid-react'
import type { Key, ReactNode } from 'react'

const ICONS: Record<RowActionId, ReactNode> = {
	[RowActionId.Edit]: <Pencil size={16} />,
	[RowActionId.Delete]: <Trash2 size={16} />,
	[RowActionId.PinTop]: <ArrowUpToLine size={16} />,
	[RowActionId.PinBottom]: <ArrowDownToLine size={16} />,
	[RowActionId.Unpin]: <PinOff size={16} />,
}

/**
 * Fresh item objects on every render: `useCachedChildren` keys its element cache on the item
 * identity, so reusing objects would freeze the rendered item — including any closure it captures.
 */
function toMenuItems(items: RowActionItem[]) {
	return items.map((item) => ({ ...item, icon: ICONS[item.id] }))
}

type MenuItem = ReturnType<typeof toMenuItems>[number]

export function RowActionsMenu({ items, 'aria-label': ariaLabel = 'Row actions' }: RowActionsMenuProps) {
	const onAction = (key: Key) => {
		items.find((item) => item.id === key)?.onSelect()
	}

	return (
		<Dropdown>
			{/*
			 * The Button is the trigger and must be a *direct* child of `Dropdown`: wrapping it in
			 * `Dropdown.Trigger` makes that element render its own `<button>` around this one, which
			 * is invalid HTML and breaks hydration. Same shape as the edit / delete actions so the
			 * three buttons line up.
			 */}
			<Button
				variant='ghost'
				size='sm'
				isIconOnly
				aria-label={ariaLabel}
			>
				<MoreHorizontal className='size-4' />
			</Button>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label={ariaLabel}
					items={toMenuItems(items)}
					disabledKeys={items.filter((item) => item.disabled).map((item) => item.id)}
					onAction={onAction}
				>
					{(item: MenuItem) => (
						<Dropdown.Item
							id={item.id}
							variant={item.danger ? 'danger' : 'default'}
						>
							{item.icon} {item.label}
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
