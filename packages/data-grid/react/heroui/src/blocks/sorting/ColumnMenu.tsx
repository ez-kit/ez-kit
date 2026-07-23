'use client'

import { Dropdown } from '@heroui/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EllipsisVertical, EyeOff, PinOff, X } from 'lucide-react'

import type { ColumnMenuProps } from '@ez-kit/data-grid-react'
import type { Key, ReactNode } from 'react'

enum ColumnAction {
	SortAsc = 'sort-asc',
	SortDesc = 'sort-desc',
	SortClear = 'sort-clear',
	PinLeft = 'pin-left',
	PinRight = 'pin-right',
	Unpin = 'unpin',
	Hide = 'hide',
}

type ColumnMenuItem = {
	id: ColumnAction
	label: string
	icon: ReactNode
}

/**
 * Fresh item objects on every render: `useCachedChildren` keys its element cache on the item
 * identity, so reusing objects would freeze the rendered item — including any closure it captures.
 */
function getItems({ sections }: ColumnMenuProps): ColumnMenuItem[] {
	const { pin, visibility, sorting } = sections
	const items: ColumnMenuItem[] = []

	if (sorting?.canAsc) items.push({ id: ColumnAction.SortAsc, label: 'Asc', icon: <ArrowUp size={16} /> })
	if (sorting?.canDesc) items.push({ id: ColumnAction.SortDesc, label: 'Desc', icon: <ArrowDown size={16} /> })
	if (sorting?.currentSort) items.push({ id: ColumnAction.SortClear, label: 'Clear sort', icon: <X size={16} /> })
	if (pin?.canPinLeft) items.push({ id: ColumnAction.PinLeft, label: 'Pin Left', icon: <ArrowLeft size={16} /> })
	if (pin?.canPinRight) items.push({ id: ColumnAction.PinRight, label: 'Pin Right', icon: <ArrowRight size={16} /> })
	if (pin?.isPinned) items.push({ id: ColumnAction.Unpin, label: 'Unpin', icon: <PinOff size={16} /> })
	if (visibility) items.push({ id: ColumnAction.Hide, label: 'Hide', icon: <EyeOff size={16} /> })

	return items
}

export function ColumnMenu(props: ColumnMenuProps) {
	const { pin, visibility, sorting } = props.sections

	if (!pin && !visibility && !sorting) return null

	const onAction = (key: Key) => {
		if (key === ColumnAction.SortAsc) sorting?.onSortAsc()
		if (key === ColumnAction.SortDesc) sorting?.onSortDesc()
		if (key === ColumnAction.SortClear) sorting?.onClearSort()
		if (key === ColumnAction.PinLeft) pin?.onPinLeft()
		if (key === ColumnAction.PinRight) pin?.onPinRight()
		if (key === ColumnAction.Unpin) pin?.onUnpin()
		if (key === ColumnAction.Hide) visibility?.onHide()
	}

	return (
		<Dropdown>
			<Dropdown.Trigger>
				<span
					aria-label='Column options'
					className='inline-flex items-center'
				>
					<EllipsisVertical size={14} />
				</span>
			</Dropdown.Trigger>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label='Column options'
					items={getItems(props)}
					onAction={onAction}
				>
					{(item: ColumnMenuItem) => (
						<Dropdown.Item id={item.id}>
							{item.icon} {item.label}
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
