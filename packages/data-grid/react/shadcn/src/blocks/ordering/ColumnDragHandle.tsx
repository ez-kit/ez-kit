'use client'

import { DataGridColumnDragHandle } from '@ez-kit/data-grid-react'
import { GripVertical } from 'lucide-react'

import type { DataGridColumnDragHandleProps } from '@ez-kit/data-grid-react'

/**
 * This kit's column drag handle: the shared control, wearing this kit's glyph.
 *
 * The shared `<DataGrid.ColumnDragHandle />` renders a `core.Button` and whatever children it is
 * given — it authors no visual, as nothing in `@ez-kit/data-grid-react` may. A grip is a visual, so
 * it lives here, in a `blocks/` adapter, exactly as the column resizer's `cursor-col-resize` does
 * rather than sitting in a stylesheet or in the shared package.
 *
 * `GripVertical`, the same glyph as the row handle: the grip sits before a header's label and in a
 * panel row, and one glyph reads as "drag this" on every surface of both axes.
 *
 * The cursor is on the element rather than in `styles.css` for the same reason and by the same
 * precedent. `touch-none` is not decoration: without it a touch drag scrolls the page instead of
 * moving the column.
 */
export function ColumnDragHandle({ children, ...props }: DataGridColumnDragHandleProps) {
	return (
		<DataGridColumnDragHandle {...props}>
			{children ?? (
				<GripVertical
					aria-hidden='true'
					className='size-4 cursor-grab touch-none select-none active:cursor-grabbing'
				/>
			)}
		</DataGridColumnDragHandle>
	)
}
