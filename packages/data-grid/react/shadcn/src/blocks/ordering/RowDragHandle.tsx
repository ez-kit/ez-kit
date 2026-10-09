'use client'

import { DataGridRowDragHandle } from '@ez-kit/data-grid-react'
import { GripVertical } from 'lucide-react'

import type { DataGridRowDragHandleProps } from '@ez-kit/data-grid-react'

/**
 * This kit's row drag handle: the shared control, wearing this kit's glyph.
 *
 * The shared `<DataGrid.RowDragHandle />` renders a `core.Button` and whatever children it is
 * given — it authors no visual, as nothing in `@ez-kit/data-grid-react` may. A grip is a visual,
 * so it lives here, in a `blocks/` adapter, exactly as the column resizer's `cursor-col-resize`
 * does rather than sitting in a stylesheet or in the shared package.
 *
 * The cursor is on the element rather than in `styles.css` for the same reason and by the same
 * precedent. `touch-none` is not decoration: without it a touch drag scrolls the page instead of
 * moving the row.
 */
export function RowDragHandle({ children, ...props }: DataGridRowDragHandleProps) {
	return (
		<DataGridRowDragHandle {...props}>
			{children ?? (
				<GripVertical
					aria-hidden='true'
					className='size-4 cursor-grab touch-none select-none active:cursor-grabbing'
				/>
			)}
		</DataGridRowDragHandle>
	)
}
