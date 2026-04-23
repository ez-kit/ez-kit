'use client'

import { ProgressBar } from '@heroui/react'

import type { CellViewProps, ProgressCellConfig } from '@ez-kit/data-grid-react'

export function ProgressCellView({ value, cellConfig }: CellViewProps) {
	const config = cellConfig as ProgressCellConfig | undefined
	const max = config?.max ?? 100
	const num = Number(value)
	const pct = Number.isFinite(num) ? (num / max) * 100 : 0

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
			<ProgressBar
				value={pct}
				style={{ flex: 1 }}
			>
				<ProgressBar.Track>
					<ProgressBar.Fill />
				</ProgressBar.Track>
			</ProgressBar>
			<span style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
		</span>
	)
}
