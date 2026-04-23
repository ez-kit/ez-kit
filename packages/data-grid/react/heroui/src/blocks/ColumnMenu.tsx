'use client'

import { Dropdown } from '@heroui/react'
import { ArrowLeft, ArrowRight, EllipsisVertical, EyeOff, PinOff } from 'lucide-react'

import type { ColumnMenuProps } from '@ez-kit/data-grid-react'
import type { Key } from 'react'

export function ColumnMenu({ sections }: ColumnMenuProps) {
	const { pin, visibility } = sections

	if (!pin && !visibility) return null

	const onAction = (key: Key) => {
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
