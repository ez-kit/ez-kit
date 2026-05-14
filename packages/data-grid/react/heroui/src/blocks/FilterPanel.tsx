'use client'

import type { FilterPanelProps } from '@ez-kit/data-grid-react'

const STYLE = {
	display: 'flex',
	flexWrap: 'wrap' as const,
	alignItems: 'center',
	gap: '0.5rem',
	marginBottom: '0.75rem',
}

export function FilterPanel({ children }: FilterPanelProps) {
	return <div style={STYLE}>{children}</div>
}
