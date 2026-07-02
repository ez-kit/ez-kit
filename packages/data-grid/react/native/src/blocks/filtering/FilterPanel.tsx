import type { FilterPanelProps } from '@ez-kit/data-grid-react'

export function FilterPanel({ children, hasActiveFilter }: FilterPanelProps) {
	return (
		<div
			data-slot='filter-panel-chrome'
			data-has-active={hasActiveFilter ? 'true' : 'false'}
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: '0.5rem',
				marginBottom: '0.75rem',
			}}
		>
			{children}
		</div>
	)
}
