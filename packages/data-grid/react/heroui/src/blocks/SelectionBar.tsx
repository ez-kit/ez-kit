'use client'

import { Button } from '@heroui/react'
import { Trash2, X } from 'lucide-react'

import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null

	if (variant === 'inline') {
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
					fontSize: '0.875rem',
				}}
			>
				<span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{count} selected</span>
				<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
			</div>
		)
	}

	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			data-variant='floating'
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
