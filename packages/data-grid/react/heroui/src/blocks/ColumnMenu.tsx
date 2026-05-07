'use client'

import { Dropdown } from '@heroui/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EllipsisVertical, EyeOff, PinOff, X } from 'lucide-react'

import type { ColumnMenuProps } from '@ez-kit/data-grid-react'
import type { Key } from 'react'

export function ColumnMenu({ sections }: ColumnMenuProps) {
	const { pin, visibility, sorting } = sections

	if (!pin && !visibility && !sorting) return null

	const onAction = (key: Key) => {
		if (key === 'sort-asc') sorting?.onSortAsc()
		if (key === 'sort-desc') sorting?.onSortDesc()
		if (key === 'sort-clear') sorting?.onClearSort()
		if (key === 'pin-left') pin?.onPinLeft()
		if (key === 'pin-right') pin?.onPinRight()
		if (key === 'unpin') pin?.onUnpin()
		if (key === 'hide') visibility?.onHide()
	}

	return (
		<Dropdown>
			<Dropdown.Trigger>
				<span
					aria-label='Column options'
					style={{ display: 'inline-flex', alignItems: 'center' }}
				>
					<EllipsisVertical size={14} />
				</span>
			</Dropdown.Trigger>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label='Column options'
					onAction={onAction}
				>
					{sorting?.canAsc && (
						<Dropdown.Item id='sort-asc'>
							<ArrowUp size={16} /> Asc
						</Dropdown.Item>
					)}
					{sorting?.canDesc && (
						<Dropdown.Item id='sort-desc'>
							<ArrowDown size={16} /> Desc
						</Dropdown.Item>
					)}
					{sorting?.currentSort && (
						<Dropdown.Item id='sort-clear'>
							<X size={16} /> Clear sort
						</Dropdown.Item>
					)}
					{pin?.canPinLeft && (
						<Dropdown.Item id='pin-left'>
							<ArrowLeft size={16} /> Pin Left
						</Dropdown.Item>
					)}
					{pin?.canPinRight && (
						<Dropdown.Item id='pin-right'>
							<ArrowRight size={16} /> Pin Right
						</Dropdown.Item>
					)}
					{pin?.isPinned && (
						<Dropdown.Item id='unpin'>
							<PinOff size={16} /> Unpin
						</Dropdown.Item>
					)}
					{visibility && (
						<Dropdown.Item id='hide'>
							<EyeOff size={16} /> Hide
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
