'use client'

import { Button } from '@heroui/react'
import { Trash2, X } from 'lucide-react'

import {
	ActionBar,
	ActionBarClose,
	ActionBarGroup,
	ActionBarItem,
	ActionBarSelection,
	ActionBarSeparator,
} from '../../components/ui/action-bar'

import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	if (variant === 'inline') {
		if (!open) return null

		return (
			<div
				role='toolbar'
				data-slot='selection-bar'
				data-variant='inline'
				className='dg-selection-bar flex items-center gap-2 px-3 py-2 mb-2 w-full text-sm'
			>
				<span
					data-slot='action-bar-selection'
					className='font-medium tabular-nums'
				>
					{count} selected
				</span>
				<div className='ml-auto flex items-center gap-2'>
					{onDelete && (
						<Button
							size='sm'
							variant='danger'
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
						isIconOnly
						aria-label='Clear selection'
						onPress={onClear}
					>
						<X size={16} />
					</Button>
				</div>
			</div>
		)
	}

	return (
		<ActionBar
			open={open}
			onOpenChange={(next) => {
				if (!next) onClear()
			}}
			side='bottom'
			align='center'
			sideOffset={16}
		>
			<ActionBarGroup>
				<ActionBarSelection>{count} selected</ActionBarSelection>
				<ActionBarSeparator />
				{onDelete && (
					<ActionBarItem
						variant='danger'
						onPress={onDelete}
					>
						<Trash2 size={16} />
						Delete
					</ActionBarItem>
				)}
				{actions}
				<ActionBarSeparator />
				<ActionBarClose
					aria-label='Clear selection'
					onClick={onClear}
				>
					<X size={14} />
				</ActionBarClose>
			</ActionBarGroup>
		</ActionBar>
	)
}
