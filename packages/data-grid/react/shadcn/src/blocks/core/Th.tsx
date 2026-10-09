import { forwardRef } from 'react'

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
 *
 * `forwardRef`, not a `ref` prop: `ThProps` declares the ref because a drag library is handed the
 * `<th>` through it, and on React 18 — which this package supports — `ref` never reaches a function
 * component's props. The same reason `Thead` and `Tr` are already `forwardRef`.
 */
export const Th = forwardRef<HTMLTableCellElement, ThProps>(function Th({ colSpan, style, ...props }, ref) {
	const spans = typeof colSpan === 'number' && colSpan > 1

	return (
		<TableHead
			{...props}
			{...(colSpan ? { colSpan } : {})}
			style={spans ? { gridColumn: `span ${String(colSpan)}`, ...style } : style}
			ref={ref}
		/>
	)
})
