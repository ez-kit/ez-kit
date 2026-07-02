import type { EmptyStateProps } from '@ez-kit/data-grid-react'

export function EmptyState({ columnCount }: EmptyStateProps) {
	return (
		<tr>
			<td colSpan={columnCount}>No data</td>
		</tr>
	)
}
