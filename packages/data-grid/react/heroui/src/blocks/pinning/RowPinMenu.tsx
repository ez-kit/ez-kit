'use client'

import { Dropdown } from '@heroui/react'
import { ArrowDownToLine, ArrowUpToLine, MoreHorizontal, PinOff } from 'lucide-react'

import type { RowPinMenuProps } from '@ez-kit/data-grid-react'
import type { Key, ReactNode } from 'react'

enum RowPinAction {
	PinTop = 'pin-top',
	PinBottom = 'pin-bottom',
	Unpin = 'unpin',
}

type RowPinMenuItem = {
	id: RowPinAction
	label: string
	icon: ReactNode
}

/**
 * Fresh item objects on every render: `useCachedChildren` keys its element cache on the item
 * identity, so reusing objects would freeze the rendered item — including any closure it captures.
 */
function getItems({ isPinned, canPinTop, canPinBottom }: RowPinMenuProps): RowPinMenuItem[] {
	if (isPinned) {
		return [{ id: RowPinAction.Unpin, label: 'Unpin', icon: <PinOff size={16} /> }]
	}

	return [
		...(canPinTop ? [{ id: RowPinAction.PinTop, label: 'Pin Top', icon: <ArrowUpToLine size={16} /> }] : []),
		...(canPinBottom ? [{ id: RowPinAction.PinBottom, label: 'Pin Bottom', icon: <ArrowDownToLine size={16} /> }] : []),
	]
}

export function RowPinMenu(props: RowPinMenuProps) {
	const { onPinTop, onPinBottom, onUnpin } = props

	const onAction = (key: Key) => {
		if (key === RowPinAction.PinTop) onPinTop()
		if (key === RowPinAction.PinBottom) onPinBottom()
		if (key === RowPinAction.Unpin) onUnpin()
	}

	return (
		<Dropdown>
			<Dropdown.Trigger>
				<span
					aria-label='Row pinning'
					className='inline-flex items-center'
				>
					<MoreHorizontal size={14} />
				</span>
			</Dropdown.Trigger>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label='Row pinning'
					items={getItems(props)}
					onAction={onAction}
				>
					{(item: RowPinMenuItem) => (
						<Dropdown.Item id={item.id}>
							{item.icon} {item.label}
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
