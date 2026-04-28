'use client'

import type { CellInputProps, CellViewProps } from '@ez-kit/data-grid-react'

// ── rating ────────────────────────────────────────────────────────────────────

export function RatingCellView({ value }: CellViewProps) {
	const n = Number(value)
	return (
		<span>
			{Array.from({ length: 5 }, (_, i) => (
				<span
					key={i}
					style={{ color: i < n ? '#f59e0b' : '#d1d5db', fontSize: '1rem' }}
				>
					★
				</span>
			))}
		</span>
	)
}

export function RatingCellInput({ value, onChange }: CellInputProps) {
	const n = Number(value)
	return (
		<span>
			{Array.from({ length: 5 }, (_, i) => (
				<button
					type='button'
					key={i}
					onClick={() => { onChange(i + 1); }}
					style={{
						color: i < n ? '#f59e0b' : '#d1d5db',
						fontSize: '1.25rem',
						cursor: 'pointer',
						background: 'transparent',
						border: 'none',
						padding: 0,
					}}
				>
					★
				</button>
			))}
		</span>
	)
}

// ── color ─────────────────────────────────────────────────────────────────────

export function ColorCellView({ value }: CellViewProps) {
	const hex = String(value ?? '')
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
			<span
				style={{
					display: 'inline-block',
					width: '1rem',
					height: '1rem',
					borderRadius: '50%',
					background: hex,
					border: '1px solid rgba(0,0,0,0.15)',
				}}
			/>
			{hex}
		</span>
	)
}

export function ColorCellInput({ value, onChange }: CellInputProps) {
	return (
		<input
			type='color'
			value={String(value ?? '#000000')}
			onChange={(e) => { onChange(e.target.value); }}
			style={{ width: '2.5rem', height: '2rem', cursor: 'pointer', border: 'none', padding: 0 }}
		/>
	)
}
