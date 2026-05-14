'use client'

import { Chip } from '@heroui/react'
import { X } from 'lucide-react'

import type { FilterChipProps } from '@ez-kit/data-grid-react'

/**
 * HeroUI chip used by `<DataGrid.ActiveFiltersBar />` to represent one active
 * filter. Renders the column label, current display value, and a small remove
 * button bound to `onRemove`.
 */
export function FilterChip({ label, value, onRemove, kind }: FilterChipProps) {
	return (
		<Chip
			data-slot='filter-chip'
			data-chip-kind={kind}
			variant='soft'
			size='sm'
		>
			<Chip.Label>
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
					<span style={{ fontWeight: 500, opacity: 0.75 }}>{label}</span>
					<span>{value}</span>
					<button
						type='button'
						onClick={onRemove}
						aria-label={`Remove ${label} filter`}
						data-slot='filter-chip-remove'
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							marginLeft: '0.125rem',
							padding: 0,
							border: 'none',
							background: 'transparent',
							cursor: 'pointer',
							opacity: 0.7,
						}}
					>
						<X size={12} />
					</button>
				</span>
			</Chip.Label>
		</Chip>
	)
}
