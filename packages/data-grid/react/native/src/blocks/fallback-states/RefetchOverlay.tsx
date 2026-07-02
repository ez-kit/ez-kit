import type { RefetchOverlayProps } from '@ez-kit/data-grid-react'

export function RefetchOverlay({ columnCount }: RefetchOverlayProps) {
	return (
		<tr>
			<td colSpan={columnCount}>Refreshing…</td>
		</tr>
	)
}
