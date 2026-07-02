import type { SortIndicatorProps } from '@ez-kit/data-grid-react'

export function SortIndicator({ sortDir }: SortIndicatorProps) {
	if (!sortDir) return null
	return <span aria-hidden='true'>{sortDir === 'asc' ? '↑' : '↓'}</span>
}
