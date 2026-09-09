'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'
import { Popover, cn } from '@heroui/react'
import { ListFilter } from 'lucide-react'

import type { FilterPopoverProps } from '@ez-kit/data-grid-react'

export function FilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	const messages = useGridMessages()
	return (
		<Popover>
			<Popover.Trigger>
				<span
					aria-label={messages.filtering.trigger}
					className={cn(hasActiveFilter ? 'opacity-100' : 'opacity-45')}
				>
					<ListFilter
						size={14}
						aria-hidden
					/>
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog
					aria-label={messages.filtering.trigger}
					className='p-3'
				>
					<div className='grid gap-2 min-w-64'>{children}</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
