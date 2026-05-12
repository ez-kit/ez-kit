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
} from '../components/ui/action-bar'

import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	if (variant === 'inline') {
		if (!open) return null

		return (
			<div
				role='toolbar'
				data-slot='selection-bar'
				data-variant='inline'
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem',
					padding: '0.5rem 0.75rem',
					marginBottom: '0.5rem',
					width: '100%',
					borderRadius: 'var(--heroui-radius-medium, 8px)',
					background: 'hsl(var(--heroui-default-100))',
					color: 'hsl(var(--heroui-foreground))',
					fontSize: '0.875rem',
				}}
			>
				<span
					data-slot='action-bar-selection'
					style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
				>
					{count} selected
				</span>
				<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
