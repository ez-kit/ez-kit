'use client'

import { Popover, cn } from '@heroui/react'
import { ListFilter } from 'lucide-react'

import type { FilterPopoverProps } from '@ez-kit/data-grid-react'

export function FilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	return (
		<Popover>
			<Popover.Trigger>
				<span
					aria-label='Filter'
					className={cn(hasActiveFilter ? 'opacity-100' : 'opacity-45')}
				>
					<ListFilter
						size={14}
						aria-hidden
					/>
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog aria-label='Filter'>
					<div className='grid gap-2 p-3 min-w-64'>{children}</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
