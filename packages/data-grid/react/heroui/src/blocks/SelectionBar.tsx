'use client'

import { Button } from '@heroui/react'
import { Trash2, X } from 'lucide-react'

import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null

	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}
		>
			<span>{count} selected</span>
			{onDelete && (
				<Button
					size='sm'
					variant='outline'
					onPress={onDelete}
				>
					<Trash2 size={16} />
					Delete
				</Button>
			)}
			{actions}
			<Button
				size='sm'
				variant='ghost'
				onPress={onClear}
			>
				<X size={16} />
				Clear
			</Button>
		</div>
	)
}
