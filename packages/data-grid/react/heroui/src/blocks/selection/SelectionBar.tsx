'use client'

import { SelectionPanelVariant } from '@ez-kit/data-grid-react'
import { Button } from '@heroui/react'
import { Trash2, X } from 'lucide-react'

import {
	ActionBar,
	ActionBarGroup,
	ActionBarItem,
	ActionBarSelection,
	ActionBarSeparator,
} from '../../components/ui/action-bar'

import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	const hasActions = Boolean(onDelete) || Boolean(actions)

	if (variant === SelectionPanelVariant.Inline) {
		if (!open) return null

		return (
			<div
				role='toolbar'
				aria-orientation='horizontal'
				data-slot='selection-bar'
				data-variant='inline'
				data-state='open'
				className='mb-2 flex w-full flex-row items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-surface-secondary-foreground text-sm'
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
				{hasActions && <ActionBarSeparator />}
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
				{hasActions && <ActionBarSeparator />}
				<Button
					size='sm'
					variant='ghost'
					isIconOnly
					aria-label='Clear selection'
					onPress={onClear}
				>
					<X size={16} />
				</Button>
			</ActionBarGroup>
		</ActionBar>
	)
}
