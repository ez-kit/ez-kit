import type { LoadingRowProps } from '@ez-kit/data-grid-react'

export function LoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<tr>
			<td colSpan={columnCount}>Loading…</td>
		</tr>
	)
}
