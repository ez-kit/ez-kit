'use client'

import { Progress } from '@grid-shadcn/components/ui/progress'

import type { CellViewProps, ProgressCellConfig } from '@ez-kit/data-grid-react'

export function ProgressCellView({ value, config }: CellViewProps<ProgressCellConfig>) {
	const max = config?.max ?? 100
	const num = Number(value)
	const pct = Number.isFinite(num) ? (num / max) * 100 : 0

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
			<Progress
				value={pct}
				style={{ flex: 1 }}
			/>
			<span style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
		</span>
	)
}
