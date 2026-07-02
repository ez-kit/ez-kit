import type { NoResultsStateProps } from '@ez-kit/data-grid-react'

export function NoResultsState({ columnCount }: NoResultsStateProps) {
	return (
		<tr>
			<td colSpan={columnCount}>No results</td>
		</tr>
	)
}
