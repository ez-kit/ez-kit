import { TableHead } from '@grid-shadcn/components/ui/table'

import type { ThProps } from '@ez-kit/data-grid-react'

/**
 * Header cell. Wraps the vendored `TableHead` to make `colSpan` mean something under the grid
 * layout.
 *
 * The table renders as `display: block` with a `grid-template-columns` track list, so the HTML
 * `colspan` attribute is inert — a grouped header (`columns[].columns`) got one track and sat
 * over its first child instead of spanning all of them, which quietly mislabels every column to
 * its right. `grid-column: span N` is the grid-layout spelling of the same intent; auto-placement
 * picks the start, so the group lands exactly over its leaves.
 *
 * Mirrors what `Td` already does for full-width body rows.
 */
export function Th({ colSpan, style, ...props }: ThProps) {
	const spans = typeof colSpan === 'number' && colSpan > 1

	return (
		<TableHead
			{...props}
			{...(colSpan ? { colSpan } : {})}
			style={spans ? { gridColumn: `span ${String(colSpan)}`, ...style } : style}
		/>
	)
}
