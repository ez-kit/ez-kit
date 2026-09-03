import { TableCell } from '@grid-shadcn/components/ui/table'

import type { TdProps } from '@ez-kit/data-grid-react'

export function Td({ colSpan, style, className, ...props }: TdProps) {
	const spans = typeof colSpan === 'number' && colSpan > 1
	const mergedStyle = {
		...(spans ? { gridColumn: `1 / span ${String(colSpan)}` } : {}),
		...style,
	}
	const mergedClassName = [spans ? 'justify-center' : '', className ?? ''].filter(Boolean).join(' ') || undefined
	return (
		<TableCell
			{...props}
			{...(colSpan ? { colSpan } : {})}
			{...(mergedClassName ? { className: mergedClassName } : {})}
			style={mergedStyle}
		/>
	)
}
