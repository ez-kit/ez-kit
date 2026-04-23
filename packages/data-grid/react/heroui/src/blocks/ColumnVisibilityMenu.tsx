'use client'

import { Checkbox, Popover } from '@heroui/react'
import { Columns2 } from 'lucide-react'

import type { ColumnVisibilityMenuProps } from '@ez-kit/data-grid-react'

export function ColumnVisibilityMenu({ columns }: ColumnVisibilityMenuProps) {
	return (
		<Popover>
			<Popover.Trigger>
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
					<Columns2 size={16} />
					Columns
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog aria-label='Column visibility'>
					<div style={{ display: 'grid', gap: '0.25rem', minWidth: 160, padding: '0.5rem' }}>
						{columns.map((col) => (
							<Checkbox
								key={col.id}
								isSelected={col.isVisible}
								onChange={col.onToggle}
							>
								{col.label}
							</Checkbox>
						))}
					</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
