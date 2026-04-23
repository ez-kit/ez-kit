'use client'

import { Popover } from '@heroui/react'
import { ListFilter } from 'lucide-react'

import type { FilterPopoverProps } from '@ez-kit/data-grid-react'

export function FilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	return (
		<Popover>
			<Popover.Trigger>
				<span
					aria-label='Filter'
					style={{ opacity: hasActiveFilter ? 1 : 0.45 }}
				>
					<ListFilter
						size={14}
						aria-hidden
					/>
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog aria-label='Filter'>
					<div style={{ display: 'grid', gap: '0.5rem', minWidth: 256, padding: '0.75rem' }}>{children}</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
