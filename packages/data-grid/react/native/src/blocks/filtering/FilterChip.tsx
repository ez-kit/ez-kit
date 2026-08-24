import type { FilterChipProps } from '@ez-kit/data-grid-react'

export function FilterChip({ label, value, onRemove, kind, isDraft }: FilterChipProps) {
	return (
		<span
			data-slot='filter-chip'
			data-chip-kind={kind}
			{...(isDraft ? { 'data-draft-filter': '' } : {})}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				padding: '2px 6px',
				border: '1px solid #ccc',
				borderRadius: 4,
				fontSize: '0.875rem',
			}}
		>
			<strong>{label}</strong>
			<span>{value}</span>
			<button
				type='button'
				aria-label={`Remove ${label} filter`}
				onClick={onRemove}
				style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
			>
				×
			</button>
		</span>
	)
}
