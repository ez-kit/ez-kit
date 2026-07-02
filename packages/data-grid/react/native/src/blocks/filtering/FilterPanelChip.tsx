import { useState } from 'react'

import type { FilterPanelChipProps } from '@ez-kit/data-grid-react'

export function FilterPanelChip({ label, valueDisplay, hasValue, onClear, children }: FilterPanelChipProps) {
	const [open, setOpen] = useState(false)
	return (
		<span
			data-slot='filter-panel-chip'
			data-has-value={hasValue ? 'true' : 'false'}
			style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 2 }}
		>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 4,
					border: '1px solid #ccc',
					borderRadius: 4,
					padding: '2px 8px',
					background: hasValue ? '#eef' : 'transparent',
					cursor: 'pointer',
					fontSize: '0.75rem',
				}}
			>
				<span style={{ fontWeight: 500 }}>{label}:</span>
				<span
					data-slot='filter-panel-chip-value'
					style={{ opacity: hasValue ? 1 : 0.6 }}
				>
					{valueDisplay}
				</span>
				{hasValue && (
					<span
						role='button'
						tabIndex={0}
						aria-label={`Clear ${label} filter`}
						onClick={(e) => {
							e.stopPropagation()
							onClear()
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								e.stopPropagation()
								onClear()
							}
						}}
						style={{ marginLeft: 4, cursor: 'pointer' }}
					>
						×
					</span>
				)}
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: 'calc(100% + 4px)',
						left: 0,
						zIndex: 10,
						background: '#fff',
						border: '1px solid #ccc',
						borderRadius: 6,
						padding: '0.5rem',
						minWidth: 220,
					}}
				>
					{children}
				</div>
			)}
		</span>
	)
}
