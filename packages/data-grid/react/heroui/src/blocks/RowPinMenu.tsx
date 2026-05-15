'use client'

import { Dropdown } from '@heroui/react'
import { ArrowDownToLine, ArrowUpToLine, PinOff } from 'lucide-react'

import type { RowPinMenuProps } from '@ez-kit/data-grid-react'
import type { Key } from 'react'

export function RowPinMenu({ isPinned, canPinTop, canPinBottom, onPinTop, onPinBottom, onUnpin }: RowPinMenuProps) {
	const onAction = (key: Key) => {
		if (key === 'pin-top') onPinTop()
		if (key === 'pin-bottom') onPinBottom()
		if (key === 'unpin') onUnpin()
	}

	return (
		<Dropdown>
			<Dropdown.Trigger>
				<span
					aria-label='Row pinning'
					className='inline-flex items-center'
				>
					{isPinned ? <PinOff size={14} /> : <ArrowUpToLine size={14} />}
				</span>
			</Dropdown.Trigger>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label='Row pinning'
					onAction={onAction}
				>
					{isPinned ? (
						<Dropdown.Item id='unpin'>
							<PinOff size={16} /> Unpin
						</Dropdown.Item>
					) : (
						<>
							{canPinTop && (
								<Dropdown.Item id='pin-top'>
									<ArrowUpToLine size={16} /> Pin Top
								</Dropdown.Item>
							)}
							{canPinBottom && (
								<Dropdown.Item id='pin-bottom'>
									<ArrowDownToLine size={16} /> Pin Bottom
								</Dropdown.Item>
							)}
						</>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
