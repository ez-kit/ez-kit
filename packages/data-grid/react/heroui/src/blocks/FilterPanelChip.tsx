'use client'

import { Button, Popover } from '@heroui/react'
import { X } from 'lucide-react'

import type { FilterPanelChipProps } from '@ez-kit/data-grid-react'
import type { MouseEvent } from 'react'

const TRIGGER_STYLE = {
	fontSize: '0.75rem',
	gap: '0.25rem',
} as const

const LABEL_STYLE = {
	fontWeight: 500,
}

const VALUE_STYLE = {
	opacity: 0.85,
}

const CLEAR_STYLE = {
	marginLeft: '0.25rem',
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	cursor: 'pointer',
	borderRadius: 3,
	padding: 1,
}

const DIALOG_STYLE = {
	display: 'flex',
	flexDirection: 'column' as const,
	gap: '0.5rem',
	minWidth: 220,
	padding: '0.5rem',
}

export function FilterPanelChip({ label, valueDisplay, hasValue, onClear, children }: FilterPanelChipProps) {
	const handleClear = (e: MouseEvent<HTMLSpanElement>): void => {
		e.stopPropagation()
		e.preventDefault()
		onClear()
	}

	return (
		<Popover>
			<Popover.Trigger>
				<Button
					variant={hasValue ? 'secondary' : 'tertiary'}
					size='sm'
					style={TRIGGER_STYLE}
					data-slot='filter-panel-chip'
					data-has-value={hasValue ? 'true' : 'false'}
				>
					<span style={LABEL_STYLE}>{label}:</span>{' '}
					<span
						data-slot='filter-panel-chip-value'
						style={VALUE_STYLE}
					>
						{valueDisplay}
					</span>
					{hasValue && (
						<span
							role='button'
							tabIndex={0}
							aria-label={`Clear ${label} filter`}
							onClick={handleClear}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									e.stopPropagation()
									onClear()
								}
							}}
							style={CLEAR_STYLE}
						>
							<X
								size={12}
								aria-hidden
							/>
						</span>
					)}
				</Button>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog aria-label={`Filter ${label}`}>
					<div style={DIALOG_STYLE}>{children}</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
